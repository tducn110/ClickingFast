import React from 'react';
import { LeaderboardEntry } from '../hooks/useLocalLeaderboard';

export function LeaderboardTable({ data }: { data: LeaderboardEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-sm opacity-60 italic py-4">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      <table className="w-full text-sm text-left">
        <thead className="sticky top-0 bg-[#e6d5c1] text-xs uppercase opacity-80 z-10 shadow-sm">
          <tr>
            <th className="px-3 py-2 rounded-l-md">#</th>
            <th className="px-3 py-2">Tên</th>
            <th className="px-3 py-2 text-right rounded-r-md">Điểm</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => (
            <tr key={entry.id} className="border-b border-[#B0B3B4]/30 last:border-0 hover:bg-[#d5c3b1]/40 transition-colors">
              <td className="px-3 py-2 font-medium opacity-70">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
              </td>
              <td className="px-3 py-2 font-semibold truncate max-w-[120px]" title={entry.name}>
                {entry.name}
              </td>
              <td className="px-3 py-2 text-right font-bold text-[#EED05E]">
                {entry.score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
