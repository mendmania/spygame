'use client';

import { useMemo } from 'react';
import type { DailyStats, GameType, ChartDataPoint } from '@/types';

interface AnalyticsChartProps {
  data: DailyStats[];
  title: string;
  showLegend?: boolean;
}

// Game colors matching the dashboard
const GAME_COLORS: Record<GameType, { bg: string; text: string; bar: string }> = {
  spyfall: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  werewolf: { bg: 'bg-red-500/20', text: 'text-red-400', bar: 'bg-red-500' },
  codenames: { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: 'bg-blue-500' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()}`;
}

export function AnalyticsChart({ data, title, showLegend = true }: AnalyticsChartProps) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map(day => ({
      date: day.date,
      label: formatDate(day.date),
      spyfall: day.gamesCreated.spyfall,
      werewolf: day.gamesCreated.werewolf,
      codenames: day.gamesCreated.codenames,
      total: day.gamesCreated.total,
    }));
  }, [data]);

  const maxValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.total), 1);
    // Round up to nearest nice number
    if (max <= 5) return 5;
    if (max <= 10) return 10;
    if (max <= 20) return 20;
    return Math.ceil(max / 10) * 10;
  }, [chartData]);

  const mostActiveDay = useMemo(() => {
    let maxIdx = 0;
    let maxTotal = 0;
    chartData.forEach((d, i) => {
      if (d.total > maxTotal) {
        maxTotal = d.total;
        maxIdx = i;
      }
    });
    return maxTotal > 0 ? maxIdx : -1;
  }, [chartData]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {showLegend && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${GAME_COLORS.spyfall.bar}`}></div>
              <span className="text-gray-400">Spyfall</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${GAME_COLORS.werewolf.bar}`}></div>
              <span className="text-gray-400">Werewolf</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${GAME_COLORS.codenames.bar}`}></div>
              <span className="text-gray-400">Codenames</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue}</span>
          <span>{Math.floor(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-10">
          {/* Grid lines */}
          <div className="absolute left-10 right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
            <div className="border-t border-gray-800"></div>
            <div className="border-t border-gray-800"></div>
            <div className="border-t border-gray-800"></div>
          </div>

          {/* Bars */}
          <div className="flex items-end justify-between gap-1 md:gap-2 h-48 mb-2 relative">
            {chartData.map((day, idx) => {
              const heightPercent = (day.total / maxValue) * 100;
              const isMostActive = idx === mostActiveDay && day.total > 0;
              
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs whitespace-nowrap shadow-lg">
                      <div className="font-medium mb-1">{day.label}</div>
                      <div className="space-y-1">
                        {day.spyfall > 0 && (
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded ${GAME_COLORS.spyfall.bar}`}></div>
                            <span>Spyfall: {day.spyfall}</span>
                          </div>
                        )}
                        {day.werewolf > 0 && (
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded ${GAME_COLORS.werewolf.bar}`}></div>
                            <span>Werewolf: {day.werewolf}</span>
                          </div>
                        )}
                        {day.codenames > 0 && (
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded ${GAME_COLORS.codenames.bar}`}></div>
                            <span>Codenames: {day.codenames}</span>
                          </div>
                        )}
                        <div className="border-t border-gray-700 pt-1 font-medium">
                          Total: {day.total}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stacked bar */}
                  <div
                    className={`w-full rounded-t transition-all duration-300 flex flex-col-reverse overflow-hidden ${
                      isMostActive ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{ height: `${Math.max(heightPercent, day.total > 0 ? 4 : 0)}%` }}
                  >
                    {day.codenames > 0 && (
                      <div
                        className={`w-full ${GAME_COLORS.codenames.bar}`}
                        style={{ height: `${(day.codenames / day.total) * 100}%` }}
                      ></div>
                    )}
                    {day.werewolf > 0 && (
                      <div
                        className={`w-full ${GAME_COLORS.werewolf.bar}`}
                        style={{ height: `${(day.werewolf / day.total) * 100}%` }}
                      ></div>
                    )}
                    {day.spyfall > 0 && (
                      <div
                        className={`w-full ${GAME_COLORS.spyfall.bar}`}
                        style={{ height: `${(day.spyfall / day.total) * 100}%` }}
                      ></div>
                    )}
                  </div>

                  {/* Most active indicator */}
                  {isMostActive && (
                    <div className="absolute -top-6 text-yellow-500 text-xs">
                      ⭐
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-500">
            {chartData.map(day => (
              <div key={day.date} className="flex-1 text-center truncate px-1">
                {day.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Total (7 days)</span>
          <p className="font-medium text-lg">
            {chartData.reduce((sum, d) => sum + d.total, 0)}
          </p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Daily Average</span>
          <p className="font-medium text-lg">
            {(chartData.reduce((sum, d) => sum + d.total, 0) / 7).toFixed(1)}
          </p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Most Active</span>
          <p className="font-medium">
            {mostActiveDay >= 0 ? chartData[mostActiveDay].label : '-'}
          </p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Peak Games</span>
          <p className="font-medium text-lg">
            {mostActiveDay >= 0 ? chartData[mostActiveDay].total : 0}
          </p>
        </div>
      </div>
    </div>
  );
}

interface GameBreakdownProps {
  todayByGame: { spyfall: number; werewolf: number; codenames: number; total: number };
  weekByGame: { spyfall: number; werewolf: number; codenames: number; total: number };
}

export function GameBreakdownCard({ todayByGame, weekByGame }: GameBreakdownProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4">Games by Type</h3>
      
      <div className="space-y-6">
        {/* Today */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Today</span>
            <span className="text-sm font-medium">{todayByGame.total} games</span>
          </div>
          <div className="flex gap-2">
            {(['spyfall', 'werewolf', 'codenames'] as GameType[]).map(game => {
              const count = todayByGame[game];
              const percent = todayByGame.total > 0 ? (count / todayByGame.total) * 100 : 0;
              return (
                <div
                  key={game}
                  className={`h-3 rounded ${GAME_COLORS[game].bar} transition-all duration-300`}
                  style={{ width: `${Math.max(percent, count > 0 ? 10 : 0)}%` }}
                  title={`${game}: ${count}`}
                ></div>
              );
            })}
            {todayByGame.total === 0 && (
              <div className="h-3 w-full bg-gray-800 rounded"></div>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className={GAME_COLORS.spyfall.text}>🕵️ {todayByGame.spyfall}</span>
            <span className={GAME_COLORS.werewolf.text}>🐺 {todayByGame.werewolf}</span>
            <span className={GAME_COLORS.codenames.text}>🔤 {todayByGame.codenames}</span>
          </div>
        </div>

        {/* This Week */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">This Week</span>
            <span className="text-sm font-medium">{weekByGame.total} games</span>
          </div>
          <div className="flex gap-2">
            {(['spyfall', 'werewolf', 'codenames'] as GameType[]).map(game => {
              const count = weekByGame[game];
              const percent = weekByGame.total > 0 ? (count / weekByGame.total) * 100 : 0;
              return (
                <div
                  key={game}
                  className={`h-3 rounded ${GAME_COLORS[game].bar} transition-all duration-300`}
                  style={{ width: `${Math.max(percent, count > 0 ? 10 : 0)}%` }}
                  title={`${game}: ${count}`}
                ></div>
              );
            })}
            {weekByGame.total === 0 && (
              <div className="h-3 w-full bg-gray-800 rounded"></div>
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span className={GAME_COLORS.spyfall.text}>🕵️ {weekByGame.spyfall}</span>
            <span className={GAME_COLORS.werewolf.text}>🐺 {weekByGame.werewolf}</span>
            <span className={GAME_COLORS.codenames.text}>🔤 {weekByGame.codenames}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface WeeklySummaryProps {
  last4Weeks: Array<{
    weekStart: string;
    weekEnd: string;
    gamesCreated: { total: number };
    mostActiveDay: string;
    averageGamesPerDay: number;
  }>;
}

export function WeeklySummaryCard({ last4Weeks }: WeeklySummaryProps) {
  const formatWeekRange = (start: string, end: string): string => {
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}`;
    }
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
  };

  const maxGames = Math.max(...last4Weeks.map(w => w.gamesCreated.total), 1);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4">Weekly Trend</h3>
      
      <div className="space-y-3">
        {last4Weeks.map((week, idx) => {
          const isCurrentWeek = idx === last4Weeks.length - 1;
          const widthPercent = (week.gamesCreated.total / maxGames) * 100;
          
          return (
            <div key={week.weekStart}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={isCurrentWeek ? 'font-medium text-blue-400' : 'text-gray-400'}>
                  {isCurrentWeek ? '📅 This Week' : formatWeekRange(week.weekStart, week.weekEnd)}
                </span>
                <span className="font-medium">{week.gamesCreated.total} games</span>
              </div>
              <div className="h-2 bg-gray-800 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all duration-300 ${
                    isCurrentWeek ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 text-sm text-gray-400">
        <div className="flex items-center justify-between">
          <span>4-Week Average</span>
          <span className="font-medium text-white">
            {(last4Weeks.reduce((sum, w) => sum + w.gamesCreated.total, 0) / 4).toFixed(1)} games/week
          </span>
        </div>
      </div>
    </div>
  );
}
