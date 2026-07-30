import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readWorkspaceFileAt,
  writeWorkspaceFileAtomicAt,
} from '../vite-plugins/deqingWaterloggingWorkspaceApiPlugin';
import {
  createWorkspaceSaveCoordinator,
  fetchWorkspaceFromServer,
  saveWorkspaceToServer,
  WorkspaceRevisionConflictError,
} from '../src/prototypes/deqing-waterlogging-risk/workspaceService';
import {
  DEQING_WORKSPACE_VERSION,
  type DeqingWaterloggingWorkspace,
} from '../src/prototypes/deqing-waterlogging-risk/workspaceTypes';
import { validateWorkspace } from '../src/prototypes/deqing-waterlogging-risk/workspaceValidation';

function workspace(revision = 0): DeqingWaterloggingWorkspace {
  return {
    version: DEQING_WORKSPACE_VERSION,
    revision,
    updatedAt: '2026-07-30T00:00:00.000Z',
    indicators: [],
    indicatorLevels: [],
    riskLevelRecords: [],
    points: [],
    regionalPreventionRecords: [],
    riskChangeLogs: [],
    architectureRecords: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('工作区 API 数据边界', () => {
  it('完整校验必需集合、revision 与集合记录', () => {
    expect(validateWorkspace(workspace(2)).valid).toBe(true);
    expect(validateWorkspace({ ...workspace(), points: undefined }).valid).toBe(false);
    expect(validateWorkspace({ ...workspace(), revision: -1 }).valid).toBe(false);
    expect(
      validateWorkspace({ ...workspace(), indicators: [{ name: '缺少 id' }] }).valid,
    ).toBe(false);
  });

  it('区分文件不存在和文件损坏，并通过同目录临时文件原子替换', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deqing-workspace-'));
    const file = path.join(dir, 'workspace.json');
    try {
      expect(readWorkspaceFileAt(file)).toEqual({ status: 'missing' });

      fs.writeFileSync(file, '{bad json', 'utf8');
      expect(readWorkspaceFileAt(file).status).toBe('corrupt');

      writeWorkspaceFileAtomicAt(file, workspace(3));
      const loaded = readWorkspaceFileAt(file);
      expect(loaded.status).toBe('ok');
      if (loaded.status === 'ok') expect(loaded.workspace.revision).toBe(3);
      expect(fs.readdirSync(dir)).toEqual(['workspace.json']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('原子替换失败时保留旧工作区并清理临时文件', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deqing-workspace-atomic-'));
    const file = path.join(dir, 'workspace.json');
    try {
      writeWorkspaceFileAtomicAt(file, workspace(2));
      vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
        throw new Error('simulated rename failure');
      });

      expect(() => writeWorkspaceFileAtomicAt(file, workspace(3))).toThrow(
        'simulated rename failure',
      );
      const loaded = readWorkspaceFileAt(file);
      expect(loaded.status).toBe('ok');
      if (loaded.status === 'ok') expect(loaded.workspace.revision).toBe(2);
      expect(fs.readdirSync(dir)).toEqual(['workspace.json']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('GET 只有 404 返回未初始化，500 和损坏响应都会阻断', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({ error: 'missing' }),
      }),
    );
    await expect(fetchWorkspaceFromServer()).resolves.toBeNull();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        status: 500,
        ok: false,
        json: async () => ({ error: '工作区 JSON 损坏' }),
      }),
    );
    await expect(fetchWorkspaceFromServer()).rejects.toThrow('工作区 JSON 损坏');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ version: 2 }),
      }),
    );
    await expect(fetchWorkspaceFromServer()).rejects.toThrow('工作区结构损坏');
  });

  it('PUT 携带期望 revision，409 暴露服务端 revision 并保留本地快照', async () => {
    const local = workspace(4);
    const fetchMock = vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({
        error: 'revision conflict',
        currentRevision: 7,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const error = await saveWorkspaceToServer(local, 4).catch(value => value);
    expect(error).toBeInstanceOf(WorkspaceRevisionConflictError);
    expect(error.currentRevision).toBe(7);
    expect(error.localWorkspace.revision).toBe(4);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      expectedRevision: 4,
      workspace: { revision: 4 },
    });
  });
});

describe('工作区串行保存协调器', () => {
  it('合并在途修改并严格使用上一次成功返回的新 revision', async () => {
    let resolveFirst!: (revision: number) => void;
    const first = new Promise<number>(resolve => {
      resolveFirst = resolve;
    });
    const save = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce(4);
    const coordinator = createWorkspaceSaveCoordinator(2, save);

    const saving = coordinator.enqueue(workspace(2));
    const savingLatest = coordinator.enqueue({
      ...workspace(2),
      updatedAt: '2026-07-30T00:00:01.000Z',
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1]).toBe(2);

    resolveFirst(3);
    await saving;
    await savingLatest;
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1]).toBe(3);
    expect(coordinator.getRevision()).toBe(4);
  });

  it('失败后保留最后本地快照，flush 可重试且快照可导出', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(6);
    const coordinator = createWorkspaceSaveCoordinator(5, save);
    const local = workspace(5);

    await expect(coordinator.enqueue(local)).rejects.toThrow('network down');
    expect(coordinator.getPendingWorkspace()).toEqual(local);
    expect(JSON.parse(coordinator.exportPendingWorkspace()!)).toEqual(local);

    await expect(coordinator.flush()).resolves.toBeUndefined();
    expect(coordinator.getRevision()).toBe(6);
    expect(coordinator.getPendingWorkspace()).toBeNull();
  });
});
