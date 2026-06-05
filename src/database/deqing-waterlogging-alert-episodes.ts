/** 预警期次元数据：期次起止由业务定义；无 endAt 表示本期进行中 */
export type WaterloggingAlertEpisodeMeta = {
  episodeId: string;
  startAt: string;
  /** 有结束时间表示本期预警已结束，不再作为当前期 */
  endAt?: string;
};

export const waterloggingAlertEpisodes: WaterloggingAlertEpisodeMeta[] = [
  {
    episodeId: 'ep-20260524',
    startAt: '2026-05-24T08:30:00+08:00',
    endAt: '2026-05-25T01:20:00+08:00',
  },
  {
    episodeId: 'ep-20260525',
    startAt: '2026-05-25T05:10:00+08:00',
  },
];

export const waterloggingAlertEpisodeMap = new Map(
  waterloggingAlertEpisodes.map(ep => [ep.episodeId, ep]),
);
