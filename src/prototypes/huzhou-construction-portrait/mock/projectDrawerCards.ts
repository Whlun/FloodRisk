import type { ProjectDrawerCard } from '../types';

/** 选中项目后右侧 drawer 卡片（仿韶山指标 drawer） */
export function getProjectDrawerCards(projectId: string): ProjectDrawerCard[] {
  const suffix = projectId.slice(-4);
  return [
    {
      id: `${projectId}-m1`,
      title: '预审与选址意见书',
      tags: ['安吉县', '农水项目'],
      matterName: '预审与选址',
      status: '已办结',
      date: '2021-03-15',
    },
    {
      id: `${projectId}-m2`,
      title: '农转用报批（批次）',
      tags: ['单独选址', '演示'],
      matterName: '农转用报批',
      status: '已批准',
      date: '2021-08-01',
    },
    {
      id: `${projectId}-m3`,
      title: '土地供应合同',
      tags: ['出让', '演示'],
      matterName: '土地供应',
      status: '已签订',
      date: '2022-02-20',
    },
    {
      id: `${projectId}-m4`,
      title: `用地规划许可（${suffix}）`,
      tags: ['许可', '演示'],
      matterName: '用地规划许可',
      status: '进行中',
      date: '2023-06-10',
    },
  ];
}
