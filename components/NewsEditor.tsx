import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Calendar } from 'lucide-react';

interface NewsItem {
    id: number;
    title: string;
    date: string;
    category: string;
    summary: string;
    color: string;
}

const NewsEditor: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<NewsItem | null>(null);

    // Initial Load
    useEffect(() => {
        const savedNews = localStorage.getItem('tntt_news_data');
        if (savedNews) {
            setNews(JSON.parse(savedNews));
        } else {
            setNews([]);
        }
    }, []);

    const saveToStorage = (items: NewsItem[]) => {
        localStorage.setItem('tntt_news_data', JSON.stringify(items));
        setNews(items);
        // Force an event to update other components if needed (CustomEvent could be used for real-time sync)
        window.dispatchEvent(new Event('storage'));
    };

    const handleAddNew = () => {
        setCurrentItem({
            id: Date.now(),
            title: "",
            date: new Date().toLocaleDateString('vi-VN'),
            category: "Thông báo",
            summary: "",
            color: "blue"
        });
        setIsEditing(true);
    };

    const handleEdit = (item: NewsItem) => {
        setCurrentItem(item);
        setIsEditing(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa tin tức này?")) {
            const updated = news.filter(n => n.id !== id);
            saveToStorage(updated);
        }
    };

    const handleSave = () => {
        if (!currentItem || !currentItem.title) return;

        let updatedNews;
        if (news.find(n => n.id === currentItem.id)) {
            // Update existing
            updatedNews = news.map(n => n.id === currentItem.id ? currentItem : n);
        } else {
            // Add new
            updatedNews = [currentItem, ...news];
        }

        saveToStorage(updatedNews);
        setIsEditing(false);
        setCurrentItem(null);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Quản Lý Tin Tức</h2>
                    <p className="text-slate-500 font-medium">Đăng tải và chỉnh sửa thông báo hiển thị trên trang chủ</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all"
                >
                    <Plus className="h-5 w-5" /> Soạn tin mới
                </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {news.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold">Chưa có tin tức nào. Hãy soạn tin mới!</p>
                    </div>
                ) : (
                    news.map((item) => (
                        <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-4 group hover:border-blue-200 transition-all">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-${item.color}-50 text-${item.color}-600`}>
                                        {item.category}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> {item.date}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-1">{item.summary}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(item)} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal / Form overlay */}
            {isEditing && currentItem && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-800">
                                {news.find(n => n.id === currentItem.id) ? 'Chỉnh sửa tin tức' : 'Soạn tin mới'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">Tiêu đề</label>
                                <input
                                    type="text"
                                    value={currentItem.title}
                                    onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="Nhập tiêu đề tin tức..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">Ngày đăng</label>
                                    <input
                                        type="text"
                                        value={currentItem.date}
                                        onChange={(e) => setCurrentItem({ ...currentItem, date: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">Danh mục</label>
                                    <select
                                        value={currentItem.category}
                                        onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
                                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    >
                                        <option value="Thông báo">Thông báo</option>
                                        <option value="Học tập">Học tập</option>
                                        <option value="Phụng vụ">Phụng vụ</option>
                                        <option value="Hoạt động">Hoạt động</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">Màu sắc thẻ</label>
                                <div className="flex gap-3">
                                    {['blue', 'green', 'purple', 'red', 'orange'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setCurrentItem({ ...currentItem, color: c })}
                                            className={`w-8 h-8 rounded-full bg-${c}-500 border-2 ${currentItem.color === c ? 'border-slate-800 scale-110 shadow-lg' : 'border-white'} transition-all`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">Nội dung tóm tắt</label>
                                <textarea
                                    rows={4}
                                    value={currentItem.summary}
                                    onChange={(e) => setCurrentItem({ ...currentItem, summary: e.target.value })}
                                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    placeholder="Nội dung sẽ hiển thị trên trang chủ..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-colors">
                                Hủy bỏ
                            </button>
                            <button onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center gap-2">
                                <Save className="h-4 w-4" /> Lưu tin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewsEditor;
