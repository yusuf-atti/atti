import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Calendar, 
  Clock, 
  Headphones, 
  HelpCircle, 
  Sparkles, 
  Send, 
  BrainCircuit,
  Volume2,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { geminiService } from './services/geminiService';
import { cn } from './lib/utils';

// --- Types ---
interface NewsItem {
  title: string;
  link: string;
  date: string;
  img: string;
  desc: string;
}

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
}

// --- Utils ---
const pcmToWav = (pcmData: string, sampleRate = 24000) => {
  const binaryString = window.atob(pcmData);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  const writeString = (v: DataView, o: number, s: string) => { 
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); 
  };
  writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + bytes.length, true);
  writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); writeString(view, 36, 'data');
  view.setUint32(40, bytes.length, true);
  const wavBytes = new Uint8Array(wavHeader.byteLength + bytes.length);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(bytes, wavHeader.byteLength);
  return new Blob([wavBytes], { type: 'audio/wav' });
};

// --- Mock Data ---
const MOCK_NEWS: NewsItem[] = [
  { title: "السعودية تُعلن جاهزية الكوادر لموسم الحج", img: "https://picsum.photos/seed/hajj/800/600", date: "29 نوفمبر", desc: "أعلن البرنامج عن جاهزية الكوادر البشرية لتقديم أفضل الخدمات لضيوف الرحمن في المشاعر المقدسة.", link: "#" },
  { title: "توجيهات جديدة لصيانة الطائرات في المطارات المحلية", img: "https://picsum.photos/seed/plane/800/600", date: "29 نوفمبر", desc: "أصدرت هيئة الطيران المدني توجيهات جديدة لرفع كفاءة الصيانة الدورية للطائرات وضمان سلامة المسافرين.", link: "#" },
  { title: "الأهلي يتأهل بعد مباراة حماسية في دوري روشن", img: "https://picsum.photos/seed/football/800/600", date: "29 نوفمبر", desc: "نجح النادي الأهلي في حجز مقعده في الأدوار النهائية بعد فوز مستحق على منافسه في مباراة شهدت حضوراً جماهيرياً كبيراً.", link: "#" },
  { title: "مبادرات نوعية لدعم أسر الشهداء في المنطقة الشرقية", img: "https://picsum.photos/seed/saudi/800/600", date: "28 نوفمبر", desc: "أطلقت جمعية البر مبادرات جديدة تهدف إلى توفير الدعم التعليمي والاجتماعي لأبناء وأسر الشهداء.", link: "#" },
  { title: "انطلاق معرض الرياض الدولي للكتاب بمشاركة عالمية", img: "https://picsum.photos/seed/books/800/600", date: "28 نوفمبر", desc: "شهد المعرض إقبالاً كبيراً في يومه الأول مع مشاركة واسعة من دور النشر العربية والعالمية.", link: "#" },
  { title: "تطورات اقتصادية إيجابية في القطاع غير النفطي", img: "https://picsum.photos/seed/economy/800/600", date: "27 نوفمبر", desc: "أظهرت التقارير الأخيرة نمواً ملحوظاً في مساهمة القطاع غير النفطي في الناتج المحلي الإجمالي.", link: "#" },
];

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [analysisData, setAnalysisData] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<{ correct: boolean, index: number } | null>(null);
  
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Simulate fetching news
    setTimeout(() => {
      setNews(MOCK_NEWS);
      setLoading(false);
    }, 1500);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const context = news.slice(0, 5).map(n => n.title).join('\n');
      const reply = await geminiService.chat(userMsg, context);
      setChatMessages(prev => [...prev, { role: 'ai', text: reply || 'عذراً، لم أستطع فهم ذلك.' }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAnalyze = async (item: NewsItem) => {
    setAnalysisData(null);
    setIsAnalysisLoading(true);
    try {
      const analysis = await geminiService.analyzeNews(item.title, item.desc);
      setAnalysisData(analysis || 'لا يوجد تحليل متاح حالياً.');
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleQuiz = async (item: NewsItem) => {
    setQuizData(null);
    setQuizFeedback(null);
    setIsQuizLoading(true);
    try {
      const quiz = await geminiService.generateQuiz(item.title, item.desc);
      setQuizData(quiz);
    } catch (error) {
      console.error(error);
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSpeak = async (item: NewsItem, id: string) => {
    if (speakingId === id) {
      audioRef.current?.pause();
      setSpeakingId(null);
      return;
    }

    setSpeakingId(id);
    try {
      const summary = `${item.title}. ${item.desc}`;
      const pcm = await geminiService.textToSpeech(summary);
      if (pcm) {
        const blob = pcmToWav(pcm);
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          audioRef.current.onended = () => setSpeakingId(null);
        }
      }
    } catch (error) {
      console.error(error);
      setSpeakingId(null);
    }
  };

  return (
    <div className={cn("min-h-screen font-sans selection:bg-gold-400 selection:text-black", isDarkMode ? "dark bg-navy-900 text-gray-100" : "bg-gray-50 text-gray-900")}>
      <audio ref={audioRef} className="hidden" />

      {/* Navbar */}
      <nav className="fixed w-full z-50 glass-nav">
        <div className="container mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black tracking-tighter cursor-pointer">
              الـحقيقة <span className="text-gold-400 text-4xl">.</span>
            </div>
            <div className="hidden md:flex h-6 w-px bg-gray-700 mx-2"></div>
            <span className="hidden md:block text-xs text-gray-400 tracking-widest uppercase">صوت الواقع</span>
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#" className="hover:text-gold-400 transition-colors">الرئيسية</a>
            <a href="#" className="hover:text-gold-400 transition-colors">أخبار محلية</a>
            <a href="#" className="hover:text-gold-400 transition-colors">تقارير</a>
            <a href="#" className="hover:text-gold-400 transition-colors">رياضة</a>
            <button className="text-gold-400 flex items-center gap-1 hover:text-white transition-colors">
              <Cpu className="w-4 h-4" /> إعدادات AI
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button className="p-2 hover:bg-gold-400/20 rounded-full transition-colors text-gold-400">
              <ShieldCheck className="w-5 h-5" />
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 hover:bg-white/5 rounded-full transition-colors">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-navy-900 border-t border-white/10 px-6 py-6 overflow-hidden"
            >
              <div className="flex flex-col gap-6 text-sm font-medium">
                <a href="#" className="hover:text-gold-400">الرئيسية</a>
                <a href="#" className="hover:text-gold-400">أخبار محلية</a>
                <a href="#" className="hover:text-gold-400">تقارير</a>
                <a href="#" className="hover:text-gold-400">رياضة</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Breaking News Ticker */}
      <div className="fixed top-20 w-full z-40 bg-navy-800 border-b border-white/5 py-2 overflow-hidden">
        <div className="container mx-auto px-6 flex items-center">
          <span className="text-gold-400 text-xs font-bold ml-4 whitespace-nowrap px-2 border-l border-gray-700">عاجل</span>
          <div className="w-full overflow-hidden relative h-5">
            <div className="marquee text-xs text-gray-300 whitespace-nowrap">
              {news.map(n => ` • ${n.title}`).join('')}
            </div>
          </div>
        </div>
      </div>

      <main className="pt-36 pb-20 container mx-auto px-6">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
              <div className="lg:col-span-8 relative group rounded-2xl overflow-hidden shadow-2xl aspect-video lg:aspect-auto lg:h-[500px]">
                <img 
                  src={news[0]?.img} 
                  alt={news[0]?.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 hero-gradient"></div>
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button 
                    onClick={() => handleSpeak(news[0], 'hero')}
                    className={cn(
                      "bg-black/50 backdrop-blur border border-white/20 text-white p-2 rounded-full transition-colors",
                      speakingId === 'hero' ? "text-gold-400 border-gold-400" : "hover:bg-white hover:text-black"
                    )}
                  >
                    {speakingId === 'hero' ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Headphones className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleAnalyze(news[0])}
                    className="bg-black/50 backdrop-blur border border-gold-400/50 text-gold-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-gold-400 hover:text-black transition-colors"
                  >
                    <Sparkles className="w-3 h-3" /> تحليل AI
                  </button>
                </div>
                <div className="absolute bottom-0 p-8 w-full">
                  <span className="bg-gold-400 text-black text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">خبر رئيسي</span>
                  <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-3 group-hover:text-gold-400 transition-colors">{news[0]?.title}</h1>
                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {news[0]?.date}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-4">
                {news.slice(1, 3).map((item, i) => (
                  <div key={i} className="flex-1 relative group rounded-xl overflow-hidden">
                    <img 
                      src={item.img} 
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-60 group-hover:opacity-40" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 p-5">
                      <h3 className="text-lg font-bold leading-snug group-hover:text-gold-400 transition-colors">{item.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* News Feed */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <span className="w-2 h-8 bg-gold-400 rounded-full"></span>
                    آخر المستجدات
                  </h2>
                  <button className="text-sm text-gray-500 hover:text-white transition-colors">عرض المزيد ←</button>
                </div>
                
                <div className="space-y-6">
                  {news.slice(3).map((item, i) => (
                    <motion.article 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="flex gap-4 group bg-white/5 p-4 rounded-xl border border-white/5 hover:border-gold-400/30 transition-all"
                    >
                      <div className="w-24 h-24 md:w-48 md:h-32 flex-shrink-0 overflow-hidden rounded-lg">
                        <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex flex-col flex-grow">
                        <h3 className="text-base md:text-lg font-bold text-gray-200 group-hover:text-white transition-colors line-clamp-2">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.desc}</p>
                        <div className="mt-auto flex justify-between items-center pt-3">
                          <div className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {item.date}</div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSpeak(item, `news-${i}`)}
                              className={cn(
                                "p-2 rounded border border-white/10 transition-colors",
                                speakingId === `news-${i}` ? "text-gold-400 border-gold-400" : "hover:bg-white hover:text-black"
                              )}
                            >
                              <Headphones className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleQuiz(item)}
                              className="p-2 rounded border border-white/10 hover:bg-white hover:text-black transition-colors"
                            >
                              <HelpCircle className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleAnalyze(item)}
                              className="text-xs text-gold-400 border border-gold-400/30 px-3 py-1 rounded hover:bg-gold-400 hover:text-black transition-colors flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" /> تحليل
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4">
                <div className="sticky top-32 bg-navy-800/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                  <h3 className="text-lg font-bold mb-6 border-b border-white/10 pb-2 text-gold-400">الأكثر قراءة</h3>
                  <div className="space-y-5">
                    {news.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex gap-3 cursor-pointer group">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium group-hover:text-gold-400 transition-colors line-clamp-2">{item.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                        </div>
                        <img src={item.img} alt={item.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* AI Chat Widget */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-80 md:w-96 bg-navy-800 border border-gold-400/30 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-navy-900 p-4 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-bold text-gold-400 text-sm">مساعد الحقيقة AI</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="h-80 overflow-y-auto p-4 space-y-3 bg-navy-800/95 text-sm scrollbar-hide">
                {chatMessages.length === 0 && (
                  <p className="text-gray-500 text-center mt-10">كيف يمكنني مساعدتك اليوم؟</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "p-3 rounded-xl max-w-[90%]",
                    msg.role === 'user' ? "bg-gold-400 text-black self-end mr-auto" : "bg-white/5 text-gray-300 self-start"
                  )}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="bg-white/5 p-3 rounded-xl self-start flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                )}
              </div>
              <div className="p-3 bg-navy-900 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="اكتب سؤالك هنا..." 
                    className="w-full bg-black/30 border border-white/10 rounded-full py-2 px-4 pr-10 text-white text-sm focus:outline-none focus:border-gold-400/50 transition-colors"
                  />
                  <button onClick={handleSendMessage} className="absolute left-2 top-1.5 p-1 text-gold-400 hover:text-white transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-gradient-to-br from-gold-400 to-gold-500 rounded-full shadow-lg shadow-gold-400/20 flex items-center justify-center text-black hover:scale-110 transition-transform duration-300"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </div>

      {/* Analysis Modal */}
      <AnimatePresence>
        {(isAnalysisLoading || analysisData) && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-navy-800 w-full max-w-2xl rounded-2xl border border-gold-400/30 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-gold-400" />
                    تحليل الذكاء الاصطناعي
                  </h3>
                  <p className="text-xs text-gray-400">مدعوم بواسطة Gemini Pro</p>
                </div>
                <button onClick={() => { setAnalysisData(null); setIsAnalysisLoading(false); }} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] scrollbar-hide">
                {isAnalysisLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gold-400 text-sm animate-pulse">جاري التحليل...</p>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
                    <ReactMarkdown>{analysisData || ''}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="p-4 bg-navy-900 border-t border-white/5 flex justify-end">
                <button onClick={() => { setAnalysisData(null); setIsAnalysisLoading(false); }} className="px-6 py-2 bg-gold-400 text-black font-bold rounded-lg hover:bg-gold-500 transition-colors">إغلاق</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      <AnimatePresence>
        {(isQuizLoading || quizData) && (
          <div className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-navy-800 w-full max-w-lg rounded-2xl border border-gold-400/30 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-start">
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-gold-400" />
                  اختبر معلوماتك
                </h3>
                <button onClick={() => { setQuizData(null); setIsQuizLoading(false); }} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                {isQuizLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gold-400 text-sm animate-pulse">جاري إعداد الأسئلة...</p>
                  </div>
                ) : quizData && (
                  <div className="space-y-6">
                    <h4 className="text-white text-lg font-bold mb-4">{quizData.question}</h4>
                    <div className="space-y-3">
                      {quizData.options.map((opt, i) => (
                        <button 
                          key={i}
                          onClick={() => setQuizFeedback({ correct: i === quizData.correctIndex, index: i })}
                          disabled={quizFeedback !== null}
                          className={cn(
                            "w-full text-right p-4 rounded-xl border transition-all",
                            quizFeedback?.index === i 
                              ? (quizFeedback.correct ? "bg-green-500/20 border-green-500 text-green-400" : "bg-red-500/20 border-red-500 text-red-400")
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {quizFeedback && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "mt-4 text-center font-bold text-lg",
                          quizFeedback.correct ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {quizFeedback.correct ? "✅ إجابة صحيحة!" : "❌ إجابة خاطئة، حاول مرة أخرى"}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-navy-800 border-t border-white/5 pt-16 pb-8">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-6">الـحقيقة</h2>
          <p className="text-gray-400 text-sm mb-8">صحيفة إلكترونية سعودية شاملة مدعومة بالذكاء الاصطناعي</p>
          <div className="flex justify-center gap-6 mb-8 text-gray-400">
            <a href="#" className="hover:text-gold-400 transition-colors">عن الصحيفة</a>
            <a href="#" className="hover:text-gold-400 transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-gold-400 transition-colors">اتصل بنا</a>
          </div>
          <div className="text-gray-600 text-xs">© 2026 جميع الحقوق محفوظة لصحيفة الحقيقة.</div>
        </div>
      </footer>
    </div>
  );
}
