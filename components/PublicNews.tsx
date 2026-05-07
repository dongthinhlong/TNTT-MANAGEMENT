import React, { useState, useEffect } from 'react';
import { Bell, Calendar, ChevronRight, Star } from 'lucide-react';

const PublicNews: React.FC = () => {
    const [newsItems, setNewsItems] = useState<any[]>([]);

    useEffect(() => {
        // Initial load
        const loadNews = () => {
            const savedNews = localStorage.getItem('tntt_news_data');
            if (savedNews) {
                setNewsItems(JSON.parse(savedNews));
            } else {
                setNewsItems([]);
            }
        };
        loadNews();

        // Listen for storage events (if multiple tabs or synced update in same window)
        window.addEventListener('storage', loadNews);
        return () => window.removeEventListener('storage', loadNews);
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-red-100 rounded-2xl">
                    <Bell className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Tin Tức & Thông Báo</h2>
            </div>

            {newsItems.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold">Chưa có tin tức nào mới.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {newsItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200 border border-slate-50 hover:-translate-y-2 transition-transform duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-${item.color}-50 text-${item.color}-600 border border-${item.color}-100`}>
                                    {item.category}
                                </span>
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {item.date}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3 leading-tight">{item.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                                {item.summary}
                            </p>
                            <button className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:gap-3 transition-all group">
                                Xem chi tiết <ChevronRight className="h-4 w-4 transition-transform group-hover:bg-blue-50 rounded-full" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PublicNews;
