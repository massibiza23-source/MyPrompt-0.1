/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Copy, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Tag, 
  Hash, 
  Clock, 
  Check,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Filter,
  MoreVertical,
  ExternalLink,
  BookOpen,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'Todos', color: 'bg-brand-accent' },
  { id: 'writing', name: 'Escritura', color: 'bg-blue-400' },
  { id: 'coding', name: 'Programación', color: 'bg-emerald-400' },
  { id: 'creative', name: 'Creativo', color: 'bg-purple-400' },
  { id: 'marketing', name: 'Marketing', color: 'bg-amber-400' },
  { id: 'other', name: 'Otros', color: 'bg-slate-400' },
];

// --- Utilities ---

const generateId = () => Math.random().toString(36).substring(2, 11);

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
};

// --- Components ---

const Toast: React.FC<{ message: string, type?: 'success' | 'error', onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl border flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 ${
        type === 'success' ? 'bg-brand-text border-white/10 text-white' : 'bg-red-900 border-white/10 text-white'
      }`}
    >
      {type === 'success' ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-red-400" />}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
};

interface AppSettings {
  theme: 'cream' | 'dark' | 'glass';
}

export default function App() {
  const [prompts, setPrompts] = useLocalStorage<Prompt[]>('pv_prompts', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('pv_categories', DEFAULT_CATEGORIES);
  const [settings, setSettings] = useLocalStorage<AppSettings>('pv_settings', { theme: 'cream' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: 'success' | 'error' }[]>([]);

  const themes = {
    cream: 'bg-brand-bg text-brand-text',
    dark: 'bg-slate-950 text-slate-100',
    glass: 'bg-blue-50/50 text-slate-800'
  };

  // Form State
  const [formData, setFormData] = useState({ title: '', content: '', category: 'writing', tags: '' });

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Handlers ---

  const handleOpenModal = (prompt?: Prompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        title: prompt.title,
        content: prompt.content,
        category: prompt.category,
        tags: prompt.tags.join(', ')
      });
    } else {
      setEditingPrompt(null);
      setFormData({ title: '', content: '', category: 'writing', tags: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPrompt(null);
  };

  const handleSavePrompt = () => {
    if (!formData.title || !formData.content) {
      addToast('El título y contenido son obligatorios', 'error');
      return;
    }

    const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingPrompt) {
      setPrompts(prev => prev.map(p => p.id === editingPrompt.id ? {
        ...p,
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: tagsArray,
        updatedAt: Date.now()
      } : p));
      addToast('Prompt actualizado correctamente');
    } else {
      const newPrompt: Prompt = {
        id: generateId(),
        title: formData.title,
        content: formData.content,
        category: formData.category,
        tags: tagsArray,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setPrompts(prev => [newPrompt, ...prev]);
      addToast('Prompt creado correctamente');
    }

    handleCloseModal();
  };

  const handleDeletePrompt = (id: string, e: React.MouseEvent<Element, MouseEvent>) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      setPrompts(prev => prev.filter(p => p.id !== id));
      addToast('Prompt eliminado');
    }
  };

  const handleCopyPrompt = (content: string, e?: React.MouseEvent<Element, MouseEvent>) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(content).then(() => {
      addToast('Copiado al portapapeles');
    });
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ prompts, categories }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PromptVault_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Copia de seguridad exportada');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.prompts)) {
          setPrompts(data.prompts);
          if (data.categories) setCategories(data.categories);
          addToast('Datos importados correctamente');
        } else {
          throw new Error('Formato inválido');
        }
      } catch (error) {
        addToast('Error al importar el archivo', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // --- Filtering ---

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [prompts, searchQuery, activeCategory]);

  return (
    <div className={`flex flex-col md:flex-row h-screen overflow-hidden ${themes[settings.theme]} selection:bg-brand-accent/20 transition-colors duration-500`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-brand-text/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-brand-border bg-brand-sidebar flex flex-col p-6 transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-brand-text">PromptVault</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 hover:bg-brand-border rounded">
            <X className="w-5 h-5 text-brand-muted" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-brand-muted font-bold mb-4 px-2">Colecciones</h3>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all group ${
                activeCategory === cat.id 
                ? 'bg-white border border-brand-border text-brand-text shadow-sm' 
                : 'text-brand-secondary hover:bg-white/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${cat.color}`} />
                <span>{cat.name}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-brand-border' : 'text-brand-muted'}`}>
                {cat.id === 'all' ? prompts.length : prompts.filter(p => p.category === cat.id).length}
              </span>
            </button>
          ))}
        </nav>

        <section className="mt-8">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-brand-muted font-bold mb-4 px-2">Etiquetas</h3>
          <div className="flex flex-wrap gap-2 px-2">
            {[...new Set(prompts.flatMap(p => p.tags))].slice(0, 8).map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-white border border-brand-border rounded text-[10px] text-brand-secondary">#{tag}</span>
            ))}
          </div>
        </section>

        <div className="mt-auto p-4 bg-brand-accent/5 border border-brand-accent/10 rounded-xl">
          <p className="text-[11px] leading-relaxed text-brand-accent flex items-start gap-2">
            <Clock className="w-3 h-3 mt-0.5 shrink-0" />
            <span>Modo Privado Activo: Los datos solo se guardan en tu navegador.</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white/30 overflow-hidden relative">
        <header className="relative z-30">
          <div className="px-4 md:px-8 py-3 border-b border-brand-border flex items-center justify-between bg-inherit backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="md:hidden p-2 hover:bg-brand-border/20 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="relative max-w-sm hidden md:block">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-brand-muted" />
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-brand-border rounded-full py-2 px-10 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Selector */}
              <div className="flex items-center gap-1 bg-brand-border/10 p-1 rounded-lg mr-2 hidden sm:flex border border-brand-border/20">
                {(['cream', 'dark', 'glass'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSettings({ ...settings, theme: t })}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      settings.theme === t ? 'bg-white shadow-sm ring-1 ring-brand-accent/20' : 'hover:bg-white/50'
                    }`}
                    title={`Tema ${t}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      t === 'cream' ? 'bg-[#FDFCF0]' : t === 'dark' ? 'bg-slate-900' : 'bg-blue-100'
                    } border border-black/10`} />
                  </button>
                ))}
              </div>

              {/* Tools Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-secondary border border-brand-border rounded-lg hover:bg-white/50 transition-all flex items-center gap-2"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Acciones</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isToolsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-brand-border rounded-xl shadow-xl overflow-hidden z-50 p-1"
                    >
                      <button 
                        onClick={() => { handleExport(); setIsToolsOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-brand-secondary hover:bg-brand-highlight hover:text-brand-accent rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descargar Backup
                      </button>
                      <button 
                        onClick={() => { 
                          const link = document.createElement('a');
                          link.href = '/icon-512.svg';
                          link.download = 'PromptVault_Icon_Light.svg';
                          link.click();
                          setIsToolsOpen(false);
                          addToast('Icono claro descargado');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-brand-secondary hover:bg-brand-highlight hover:text-brand-accent rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Icono App (Claro)
                      </button>
                      <button 
                        onClick={() => { 
                          const link = document.createElement('a');
                          link.href = '/icon-dark.svg';
                          link.download = 'PromptVault_Icon_Dark.svg';
                          link.click();
                          setIsToolsOpen(false);
                          addToast('Icono oscuro descargado');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-brand-secondary hover:bg-brand-highlight hover:text-brand-accent rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Icono App (Oscuro)
                      </button>
                      <label className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-brand-secondary hover:bg-brand-highlight hover:text-brand-accent rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        Cargar Backup
                        <input type="file" className="hidden" accept=".json" onChange={(e) => { handleImport(e); setIsToolsOpen(false); }} />
                      </label>
                      <div className="h-px bg-brand-border my-1 mx-2" />
                      <button 
                        onClick={() => { setSettings({ ...settings, theme: settings.theme === 'dark' ? 'cream' : 'dark' }); setIsToolsOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-brand-secondary hover:bg-brand-highlight hover:text-brand-accent rounded-lg transition-colors sm:hidden"
                      >
                        <Filter className="w-4 h-4" />
                        Cambiar Tema
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => handleOpenModal()}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-brand-accent rounded-lg hover:opacity-90 transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo</span>
              </button>
            </div>
          </div>
          
          {/* Mobile Search - Only visible when header is collapsed or needed */}
          <div className="px-4 py-2 border-b border-brand-border md:hidden bg-inherit">
             <div className="relative">
                <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-brand-muted" />
                <input 
                  type="text" 
                  placeholder="Buscar prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-brand-border rounded-full py-1.5 px-9 text-xs focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all"
                />
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif italic text-brand-secondary">
                {activeCategory === 'all' ? 'Todos los Prompts' : categories.find(c => c.id === activeCategory)?.name}
              </h2>
              <div className="flex gap-2 text-[10px] text-brand-muted uppercase tracking-wider font-bold">
                <span>Resultados: {filteredPrompts.length}</span>
              </div>
            </div>

            {filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-brand-muted text-center">
                <Filter className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-medium">No se encontraron prompts</p>
                <p className="text-sm">Intenta ajustar tus filtros o agrega uno nuevo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                <AnimatePresence mode="popLayout">
                  {filteredPrompts.map((prompt) => (
                    <PromptCard 
                      key={prompt.id} 
                      prompt={prompt} 
                      category={categories.find(c => c.id === prompt.category)}
                      onEdit={() => handleOpenModal(prompt)}
                      onDelete={(e) => handleDeletePrompt(prompt.id, e)}
                      onCopy={(e) => handleCopyPrompt(prompt.content, e)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal - CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-brand-text/10 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-brand-bg w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-60 border border-brand-border"
            >
              <div className="p-6 border-b border-brand-border bg-white/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-brand-text">{editingPrompt ? 'Editar Prompt' : 'Nuevo Prompt'}</h3>
                  <button onClick={handleCloseModal} className="p-1.5 hover:bg-black/5 rounded-full transition-all text-brand-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">Título</label>
                    <input 
                      type="text"
                      autoFocus
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Título descriptivo..."
                      className="w-full bg-white border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">Categoría</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-white border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all appearance-none"
                      >
                        {DEFAULT_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">Etiquetas</label>
                      <input 
                        type="text"
                        value={formData.tags}
                        onChange={(e) => setFormData({...formData, tags: e.target.value})}
                        placeholder="IA, SEO, Storytelling..."
                        className="w-full bg-white border border-brand-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-bold">Contenido del Prompt</label>
                      <span className="text-[9px] text-brand-accent/60 italic font-medium">Usa {"{{variable}}"}</span>
                    </div>
                    <textarea 
                      rows={10}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      placeholder="Escribe aquí tu prompt maestro..."
                      className="w-full bg-white border border-brand-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all resize-none font-mono leading-relaxed placeholder:italic"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-brand-sidebar border-t border-brand-border flex items-center justify-end gap-3">
                <button 
                  onClick={handleCloseModal}
                  className="px-5 py-2 text-xs font-medium text-brand-secondary hover:text-brand-text transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSavePrompt}
                  className="bg-brand-accent text-white px-8 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95"
                >
                  {editingPrompt ? 'Actualizar Prompt' : 'Guardar Prompt'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const PromptCard: React.FC<{ 
  prompt: Prompt; 
  category?: Category;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent<Element, MouseEvent>) => void;
  onCopy: (e: React.MouseEvent<Element, MouseEvent>) => void;
}> = ({ prompt, category, onEdit, onDelete, onCopy }) => {
  // Highlight variables in content
  const renderHighlightedContent = (content: string) => {
    const parts = content.split(/(\{\{[^}]+\}\})/g);
    return parts.slice(0, 5).map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        return <span key={i} className="variable-tag">{part}</span>;
      }
      return part;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={onEdit}
      className="group bg-white border border-brand-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col min-h-[220px] relative"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="px-2 py-0.5 bg-brand-highlight text-brand-accent text-[9px] font-bold uppercase tracking-wider rounded">
          {category?.name || 'Otro'}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onDelete}
            className="p-1.5 hover:bg-red-50 rounded text-brand-muted hover:text-red-600 transition-all"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-base font-semibold text-brand-text mb-2 line-clamp-1">{prompt.title}</h3>
      
      <div className="flex-1 overflow-hidden relative">
        <p className="text-xs text-brand-secondary leading-relaxed italic border-l-2 border-brand-border pl-3 line-clamp-3">
          {renderHighlightedContent(prompt.content)}
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="mt-3 pt-3 border-t border-brand-sidebar flex items-center justify-between">
        <span className="text-[9px] text-brand-muted">
          {new Date(prompt.updatedAt).toLocaleDateString()}
        </span>
        <button 
          onClick={onCopy}
          className="flex items-center gap-2 px-3 py-1 bg-brand-text text-white text-[9px] font-bold uppercase tracking-wider rounded-full group-hover:bg-brand-accent transition-colors"
        >
          <Copy className="w-3 h-3" />
          Copiar
        </button>
      </div>
    </motion.div>
  );
};

