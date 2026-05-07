import React, { useEffect, useState } from 'react';
import { api } from '../services/gasApi';
import { OverallStats, ClassSummary } from '../types';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { RANKING_COLORS } from '../constants';
import {
    RefreshCw, Users, TrendingUp, Award, BookOpen,
    BarChart3, PieChart as PieIcon, Table as TableIcon,
    Trophy, Medal, Target, ChevronRight
} from 'lucide-react';

interface DashboardProps {
    userRole?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userRole = 'GUEST' }) => {
    const [stats, setStats] = useState<OverallStats | null>(null);
    const [summaries, setSummaries] = useState<{ [key: string]: ClassSummary }>({});
    const [loading, setLoading] = useState(true);
    const [classData, setClassData] = useState<any[]>([]);

    const loadData = () => {
        setLoading(true);
        api.getClassSummariesFast().then(res => {
            setStats(res.overallStats);
            setSummaries(res.summaries);
            processClassData(res.summaries);
        }).catch(e => {
            console.error(e);
            setStats({
                totalStudents: 0,
                studentsWithScores: 0,
                studentsWithAnyScore: 0,
                rankings: {},
                classRankings: {},
                averageScore: 'N/A'
            });
        }).finally(() => {
            setLoading(false);
        });
    };

    const processClassData = (classSummaries: { [key: string]: ClassSummary }) => {
        if (!classSummaries) return;

        const data = Object.values(classSummaries).map(cls => ({
            name: cls.className,
            avgScore: cls.averageScore !== 'N/A' ? parseFloat(cls.averageScore) : 0,
            Giỏi: cls.rankings['Giỏi'] || 0,
            Khá: cls.rankings['Khá'] || 0,
            TB: cls.rankings['Trung bình'] || 0,
            Yếu: cls.rankings['Yếu'] || 0,
            total: cls.totalStudents,
            hasScore: cls.studentsWithScores
        }));

        const sortedData = data.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        setClassData(sortedData);
    };

    useEffect(() => {
        if (userRole !== 'GUEST') {
            loadData();
        } else {
            setLoading(false);
        }
    }, [userRole]);

    if (userRole === 'GUEST') {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                <BarChart3 className="h-16 w-16 mb-4 opacity-10" />
                <p className="font-bold text-lg text-slate-600">Bạn không có quyền xem thống kê này</p>
                <p className="text-sm">Vui lòng liên hệ Admin để được cấp quyền.</p>
            </div>
        );
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <p className="font-bold text-lg text-slate-600">Đang phân tích dữ liệu chuyên sâu...</p>
            <p className="text-sm">Vui lòng đợi trong giây lát</p>
        </div>
    );

    if (!stats) return <div className="p-8 text-center text-slate-500 font-bold">Không tìm thấy dữ liệu thống kê</div>;

    const totalStudents = stats.totalStudents || 0;
    const withScores = stats.studentsWithScores || 0;
    const completionRate = totalStudents > 0 ? ((withScores / totalStudents) * 100).toFixed(1) : "0.0";

    const rankingPieData = [
        { name: 'Giỏi', value: stats.rankings?.['Giỏi'] || 0 },
        { name: 'Khá', value: stats.rankings?.['Khá'] || 0 },
        { name: 'Trung bình', value: stats.rankings?.['Trung bình'] || 0 },
        { name: 'Yếu', value: stats.rankings?.['Yếu'] || 0 },
    ].filter(d => d.value > 0);

    const percentageBarData = classData.map(cls => {
        const totalRated = cls.Giỏi + cls.Khá + cls.TB + cls.Yếu;
        const div = totalRated > 0 ? totalRated : 1;
        return {
            ...cls,
            pctGiỏi: parseFloat(((cls.Giỏi / div) * 100).toFixed(1)),
            pctKhá: parseFloat(((cls.Khá / div) * 100).toFixed(1)),
            pctTB: parseFloat(((cls.TB / div) * 100).toFixed(1)),
            pctYếu: parseFloat(((cls.Yếu / div) * 100).toFixed(1)),
        };
    });

    const leaderboardData = [...classData]
        .filter(c => c.avgScore > 0)
        .sort((a, b) => b.avgScore - a.avgScore);

    const hasRankingData = rankingPieData.length > 0;
    const hasClassData = classData.length > 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* 1. Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-3 border border-blue-100">
                        <Target className="h-3 w-3" />
                        Dữ liệu thời gian thực
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Tổng quan</h2>
                    <p className="text-slate-500 font-medium mt-1">Phân tích chi tiết tình hình học tập toàn hệ thống</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/50 transition-all shadow-sm active:scale-95"
                >
                    <RefreshCw className="h-5 w-5" />
                    <span>Cập nhật số liệu</span>
                </button>
            </div>

            {/* 2. KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard
                    title="Sĩ số tổng"
                    value={totalStudents}
                    subtitle="Học sinh đang theo học"
                    icon={Users}
                    color="primary"
                />
                <KPICard
                    title="Điểm Trung Bình"
                    value={(!stats.averageScore || stats.averageScore === 'N/A') ? '--' : stats.averageScore}
                    subtitle="Trung bình tất cả học sinh"
                    icon={TrendingUp}
                    color="purple"
                />
                <KPICard
                    title="Học sinh Giỏi"
                    value={stats.rankings?.['Giỏi'] || 0}
                    subtitle={`Chiếm ${(totalStudents > 0 ? ((stats.rankings?.['Giỏi'] || 0) / totalStudents * 100).toFixed(1) : 0)}% tổng số`}
                    icon={Award}
                    color="success"
                />
                <KPICard
                    title="Tỷ lệ hoàn thành"
                    value={`${completionRate}%`}
                    subtitle={`${withScores} / ${totalStudents} đã có điểm`}
                    icon={BookOpen}
                    color="warning"
                />
            </div>

            {/* 3. Analytics Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left: Overall Ranking Pie */}
                <div className="xl:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
                    <div className="w-full flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><PieIcon className="h-6 w-6" /></div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Tỷ lệ Xếp loại</h3>
                        </div>
                    </div>
                    <div className="w-full h-[320px] flex items-center justify-center">
                        {hasRankingData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={rankingPieData}
                                        cx="50%" cy="50%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {rankingPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={RANKING_COLORS[entry.name] || '#ccc'} className="hover:opacity-80 transition-opacity outline-none" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip type="pie" />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-sm font-bold text-slate-600">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-300 flex flex-col items-center">
                                <PieIcon className="h-16 w-16 mb-4 opacity-10" />
                                <p className="font-bold">Đang chờ dữ liệu...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Class Percentage Analysis */}
                <div className="xl:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><BarChart3 className="h-6 w-6" /></div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Tỷ lệ theo lớp (%)</h3>
                        </div>
                    </div>
                    <div className="w-full h-[350px]">
                        {hasClassData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={percentageBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                        dy={15}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                        unit="%"
                                    />
                                    <Tooltip cursor={{ fill: '#f8fafc', radius: 10 }} content={<CustomTooltip type="bar" />} />
                                    <Bar dataKey="pctGiỏi" name="Giỏi" stackId="a" fill={RANKING_COLORS['Giỏi']} barSize={24} radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="pctKhá" name="Khá" stackId="a" fill={RANKING_COLORS['Khá']} />
                                    <Bar dataKey="pctTB" name="Trung bình" stackId="a" fill={RANKING_COLORS['Trung bình']} />
                                    <Bar dataKey="pctYếu" name="Yếu" stackId="a" fill={RANKING_COLORS['Yếu']} radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <BarChart3 className="h-16 w-16 mb-4 opacity-10" />
                                <p className="font-bold">Chưa có dữ liệu so sánh lớp</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Tiered Leaderboard */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="p-2.5 bg-yellow-50 rounded-xl text-yellow-600 shadow-sm shadow-yellow-200/50"><Trophy className="h-6 w-6" /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Bảng vàng thi đua</h3>
                        <p className="text-sm font-medium text-slate-500 italic">Dựa trên điểm trung bình </p>
                    </div>
                </div>

                {leaderboardData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
                        {leaderboardData.map((cls, index) => {
                            const rank = index + 1;
                            let cardClass = "bg-white border-slate-100 hover:border-slate-200";
                            let badgeIcon = <span className="text-slate-400">#{rank}</span>;

                            if (rank === 1) {
                                cardClass = "bg-gradient-to-br from-yellow-50/80 to-amber-50/50 border-yellow-200 ring-2 ring-yellow-400/10";
                                badgeIcon = <Trophy className="h-5 w-5 text-yellow-600 animate-bounce" />;
                            } else if (rank === 2) {
                                cardClass = "bg-gradient-to-br from-slate-50 to-blue-50/30 border-blue-100";
                                badgeIcon = <Medal className="h-5 w-5 text-slate-400" />;
                            } else if (rank === 3) {
                                cardClass = "bg-gradient-to-br from-orange-50/60 to-amber-50/30 border-orange-100";
                                badgeIcon = <Medal className="h-5 w-5 text-orange-400" />;
                            }

                            return (
                                <div key={cls.name} className={`group relative p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 overflow-hidden ${cardClass}`}>
                                    {rank <= 3 && <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/40 blur-2xl rounded-full" />}

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {badgeIcon}
                                                    <h4 className="font-black text-2xl text-slate-800">Lớp {cls.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    <Users className="h-3 w-3" /> {cls.total} Học viên
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-blue-600 leading-none">{cls.avgScore.toFixed(2)}</div>
                                            <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-tighter mt-1">ĐIỂM TB</div>
                                        </div>
                                    </div>

                                    <div className="mt-4 h-1.5 w-full bg-slate-100/50 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(cls.avgScore / 10) * 100}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <Trophy className="h-12 w-12 mx-auto text-slate-100 mb-4" />
                        <p className="font-bold text-slate-400 tracking-tight text-lg">Hệ thống đang thu thập điểm số để xếp hạng...</p>
                    </div>
                )}
            </div>

            {/* 5. Detailed Metric Table */}
            <div className="bg-slate-900 p-1 rounded-[3rem] shadow-2xl overflow-hidden shadow-blue-900/10">
                <div className="bg-slate-900 p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/5 rounded-2xl text-white outline outline-white/10"><TableIcon className="h-6 w-6" /></div>
                        <h3 className="text-xl font-black text-white tracking-tight text-slate-100">Dữ liệu chi tiết theo lớp</h3>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] m-1 overflow-hidden">
                    {hasClassData ? (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-8 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px]">Lớp học</th>
                                        <th className="px-4 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Sĩ số</th>
                                        <th className="px-4 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Hoàn thành</th>
                                        <th className="px-4 py-5 font-black text-slate-400 uppercase tracking-widest text-[10px] text-center">Avg Score</th>
                                        <th className="px-4 py-5 font-black text-green-600 uppercase tracking-widest text-[10px] text-center">Giỏi</th>
                                        <th className="px-4 py-5 font-black text-blue-600 uppercase tracking-widest text-[10px] text-center">Khá</th>
                                        <th className="px-4 py-5 font-black text-yellow-600 uppercase tracking-widest text-[10px] text-center">TB</th>
                                        <th className="px-4 py-5 font-black text-red-600 uppercase tracking-widest text-[10px] text-center">Yếu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {classData.map((cls) => (
                                        <tr key={cls.name} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3 font-bold text-slate-800 text-base">
                                                    {cls.name}
                                                    <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-0 group-hover:translate-x-1" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-slate-500 font-bold">{cls.total}</td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-[11px] font-bold text-slate-600">
                                                    {cls.hasScore} HS
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-black transition-all ${cls.avgScore >= 8 ? 'bg-green-100 text-green-700 shadow-sm shadow-green-200/50' :
                                                    cls.avgScore >= 6.5 ? 'bg-blue-100 text-blue-700 shadow-sm shadow-blue-200/50' :
                                                        cls.avgScore >= 5 ? 'bg-yellow-100 text-yellow-700' :
                                                            cls.avgScore > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-300'
                                                    }`}>
                                                    {cls.avgScore > 0 ? cls.avgScore.toFixed(2) : '--'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {cls.Giỏi > 0 ? <span className="font-extrabold text-green-600">{cls.Giỏi}</span> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {cls.Khá > 0 ? <span className="font-extrabold text-blue-600">{cls.Khá}</span> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {cls.TB > 0 ? <span className="font-extrabold text-yellow-600">{cls.TB}</span> : <span className="text-slate-200">-</span>}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {cls.Yếu > 0 ? <span className="font-extrabold text-red-600">{cls.Yếu}</span> : <span className="text-slate-200">-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-300 font-medium">Chưa thể tải bảng chi tiết</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Modern Sub-components ---

const KPICard = ({ title, value, subtitle, icon: Icon, color }: any) => {
    const variants: Record<string, string> = {
        primary: 'from-blue-600 to-indigo-600 text-white shadow-blue-200',
        success: 'bg-white text-green-600 border-slate-100 shadow-slate-100',
        purple: 'bg-white text-purple-600 border-slate-100 shadow-slate-100',
        warning: 'bg-white text-orange-600 border-slate-100 shadow-slate-100'
    };

    const isPrimary = color === 'primary';

    return (
        <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 ${isPrimary ? 'bg-gradient-to-br shadow-xl' : 'bg-white shadow-sm'} ${variants[color]}`}>
            <div className="flex items-center justify-between mb-8">
                <div className={`p-4 rounded-2xl ${isPrimary ? 'bg-white/20 outline outline-white/20' : 'bg-slate-50'}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <ChevronRight className={`h-5 w-5 ${isPrimary ? 'opacity-40' : 'text-slate-200'}`} />
            </div>
            <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${isPrimary ? 'text-blue-100' : 'text-slate-400'}`}>{title}</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-black tracking-tight leading-none">{value}</h3>
                </div>
                <p className={`text-xs font-bold mt-3 ${isPrimary ? 'text-white/60' : 'text-slate-400'}`}>{subtitle}</p>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 backdrop-blur-md p-5 border border-white/10 shadow-2xl rounded-[1.5rem] z-50 text-white min-w-[180px]">
                <p className="font-black text-blue-400 mb-3 border-b border-white/10 pb-2 flex items-center justify-between uppercase tracking-widest text-[10px]">
                    <span>{label || 'Chi tiết'}</span>
                    <ChevronRight className="h-3 w-3" />
                </p>
                <div className="space-y-2">
                    {payload.map((entry: any, index: number) => {
                        const isPercentage = type === 'bar';
                        const rawCountKey = entry.name;
                        const rawCount = entry.payload[rawCountKey];

                        return (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{entry.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-black text-sm">
                                    <span>{typeof entry.value === 'number' ? (isPercentage ? `${entry.value}%` : entry.value) : entry.value}</span>
                                    {isPercentage && rawCount !== undefined && (
                                        <span className="text-[10px] text-slate-500">({rawCount} HS)</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

export default Dashboard;