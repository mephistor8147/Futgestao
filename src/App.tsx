import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Settings,
  TrendingUp,
  TrendingDown,
  Wallet,
  Trash2,
  ChevronRight,
  UserPlus,
  Bell,
  Camera,
  MessageCircle,
  Image as ImageIcon,
  Save,
  Send,
  Search,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Upload,
  AlertTriangle,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

type Player = {
  id: number;
  name: string;
  phone: string;
  whatsapp: string;
  photo: string;
  status: string;
  role: 'admin' | 'treasurer' | 'member';
  password?: string;
};

type Transaction = {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  player_id: number | null;
  player_name?: string;
};

type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

type AppSettings = {
  app_title: string;
  app_logo: string;
  db_type: string;
  db_host: string;
  db_user: string;
  db_pass: string;
  db_name: string;
  pix_key: string;
  admin_password?: string;
  treasurer_password?: string;
  member_password?: string;
};

type Notification = {
  id: number;
  title: string;
  message: string;
  date: string;
  type: string;
  image?: string;
};

type Penalty = {
  id: number;
  player_id: number;
  player_name?: string;
  reason: string;
  days: number;
  date: string;
  status: 'pending' | 'paid';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'players' | 'transactions' | 'notifications' | 'admin' | 'manual' | 'admin_players' | 'penalties'>('notifications');
  const [players, setPlayers] = useState<Player[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [settings, setSettings] = useState<AppSettings>({ 
    app_title: 'FutGestão', 
    app_logo: '',
    db_type: 'sqlite',
    db_host: '',
    db_user: '',
    db_pass: '',
    db_name: '',
    pix_key: '',
    admin_password: 'admin'
  });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'treasurer' | 'member' | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggedPlayerId, setLoggedPlayerId] = useState<number | null>(null);
  const [loggedPlayerName, setLoggedPlayerName] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Search and Filter states
  const [playerSearch, setPlayerSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    type: 'all'
  });

  // Form states
  const [newPlayer, setNewPlayer] = useState({ name: '', phone: '', whatsapp: '', photo: '', role: 'member', password: '' });
  const [newTransaction, setNewTransaction] = useState({
    type: 'income',
    category: 'monthly_fee',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    player_id: ''
  });
  const [newNotification, setNewNotification] = useState({ title: '', message: '', type: 'update', image: '' });
  const [memberNewPassword, setMemberNewPassword] = useState('');
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [showPix, setShowPix] = useState(false);
  const [newPenalty, setNewPenalty] = useState({ player_id: '', reason: '', days: '', date: new Date().toISOString().split('T')[0] });
  const [driveUrl, setDriveUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemConfig, setSystemConfig] = useState({ admin_user: '', admin_pass: '', drive_sync_url: '', sync_interval_minutes: 30 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const adminPlayerFileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (playerId?: number) => {
    setLoading(true);
    try {
      const pUrl = playerId ? `/api/players?playerId=${playerId}` : '/api/players';
      const tUrl = playerId ? `/api/transactions?playerId=${playerId}` : '/api/transactions';
      const penUrl = playerId ? `/api/penalties?playerId=${playerId}` : '/api/penalties';
      
      const [pRes, tRes, sRes, setRes, nRes, penRes, configRes] = await Promise.all([
        fetch(pUrl),
        fetch(tUrl),
        fetch('/api/summary'),
        fetch('/api/settings'),
        fetch('/api/notifications'),
        fetch(penUrl),
        fetch('/api/admin/config')
      ]);
      const pData = await pRes.json();
      const tData = await tRes.json();
      const sData = await sRes.json();
      const setData = await setRes.json();
      const nData = await nRes.json();
      const penData = await penRes.json();
      const configData = await configRes.json();
      
      setPlayers(pData);
      setTransactions(tData);
      setSummary(sData);
      setSettings(setData);
      setNotifications(nData);
      setPenalties(penData);
      setSystemConfig(configData);
      setDriveUrl(configData.drive_sync_url);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberNewPassword || !loggedPlayerId) return;
    
    const player = players.find(p => p.id === loggedPlayerId);
    if (!player) return;

    try {
      const res = await fetch(`/api/players/${loggedPlayerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...player,
          password: memberNewPassword
        })
      });
      if (res.ok) {
        alert('Senha alterada com sucesso!');
        setMemberNewPassword('');
      }
    } catch (error) {
      console.error("Error changing password:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'player' | 'logo' | 'notification') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'player') {
          if (editingPlayer) setEditingPlayer({ ...editingPlayer, photo: base64 });
          else setNewPlayer({ ...newPlayer, photo: base64 });
        } else if (type === 'logo') {
          setSettings({ ...settings, app_logo: base64 });
        } else if (type === 'notification') {
          if (editingNotification) setEditingNotification({ ...editingNotification, image: base64 });
          else setNewNotification({ ...newNotification, image: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    
    const isMember = userRole === 'member';
    const body = isMember 
      ? { photo: editingPlayer.photo, photoOnly: true }
      : editingPlayer;

    await fetch(`/api/players/${editingPlayer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    setEditingPlayer(null);
    fetchData(isMember ? loggedPlayerId! : undefined);
    alert('Jogador atualizado com sucesso!');
  };

  const handleAdminPlayerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingPlayer) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingPlayer({ ...editingPlayer, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert("O arquivo está vazio ou em formato inválido.");
          return;
        }

        const response = await fetch('/api/players/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const result = await response.json();
          alert(`${result.count} jogadores importados com sucesso!`);
          fetchData();
        } else {
          const error = await response.json();
          alert("Erro ao importar: " + error.error);
        }
      } catch (err) {
        console.error("Erro ao processar Excel:", err);
        alert("Erro ao processar o arquivo Excel. Verifique o formato.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayer.name) return;
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayer)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cadastrar jogador');
      }
      
      setNewPlayer({ name: '', phone: '', whatsapp: '', photo: '', role: 'member' });
      fetchData();
      alert('Jogador cadastrado com sucesso!');
    } catch (error: any) {
      console.error("Error adding player:", error);
      alert(`Erro: ${error.message}`);
    }
  };

  const handleDeletePlayer = async (id: number) => {
    if (!confirm('Deseja realmente excluir este jogador?')) return;
    await fetch(`/api/players/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.amount) return;
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        player_id: newTransaction.player_id ? parseInt(newTransaction.player_id) : null
      })
    });
    setNewTransaction({
      type: 'income',
      category: 'monthly_fee',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      player_id: ''
    });
    fetchData();
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    alert('Configurações salvas com sucesso!');
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotification.title || !newNotification.message) return;
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotification)
    });
    setNewNotification({ title: '', message: '', type: 'update', image: '' });
    fetchData();
    alert('Notificação enviada!');
  };

  const handleUpdateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotification) return;
    await fetch(`/api/notifications/${editingNotification.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingNotification)
    });
    setEditingNotification(null);
    fetchData();
    alert('Notificação atualizada!');
  };

  const handleDeleteNotification = async (id: number) => {
    if (!confirm('Deseja excluir este aviso?')) return;
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const shareSummary = () => {
    let text = `*RESUMO FINANCEIRO - ${settings.app_title}*\n\n`;
    text += `📈 *Entradas:* ${formatCurrency(summary.totalIncome)}\n`;
    text += `📉 *Saídas:* ${formatCurrency(summary.totalExpense)}\n`;
    text += `💰 *Saldo:* ${formatCurrency(summary.balance)}\n\n`;
    
    if (settings.pix_key) {
      text += `📢 *PIX para Mensalidades:*\n\`${settings.pix_key}\` (Copia e Cola)\n\n`;
    }

    text += `_Atualizado em ${new Date().toLocaleDateString('pt-BR')}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const sharePayment = (t: Transaction) => {
    const date = new Date(t.date).toLocaleDateString('pt-BR');
    let text = `*COMPROVANTE DE PAGAMENTO - ${settings.app_title}*\n\n`;
    text += `📅 *Data:* ${date}\n`;
    text += `👤 *Jogador:* ${t.player_name || 'N/A'}\n`;
    text += `💰 *Valor:* ${formatCurrency(t.amount)}\n`;
    text += `📝 *Referência:* ${t.description || t.category}\n\n`;
    
    if (t.type === 'expense' && settings.pix_key) {
      text += `🔑 *PIX para Reembolso:* \n${settings.pix_key}\n\n`;
    } else if (t.type === 'income' && settings.pix_key) {
      text += `✅ Pagamento recebido via PIX.\n\n`;
    }

    text += `_Gerado por ${settings.app_title}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        setUserRole(data.role);
        if (data.playerId) {
          setLoggedPlayerId(data.playerId);
          setLoggedPlayerName(data.playerName);
        }
        
        if (data.role === 'member') {
          fetchData(data.playerId);
        } else {
          fetchData();
        }
      } else {
        alert(data.error || 'Credenciais inválidas!');
      }
    } catch (error) {
      alert('Erro ao tentar fazer login');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoggedPlayerId(null);
    setLoggedPlayerName(null);
    setActiveTab('notifications');
    fetchData();
  };

  const handleGenerateMonthlyFees = async () => {
    if (!confirm('Deseja gerar mensalidades para todos os jogadores ativos?')) return;
    
    const amount = prompt('Qual o valor da mensalidade?', '50.00');
    if (!amount) return;

    const activePlayers = players.filter(p => p.status === 'active');
    if (activePlayers.length === 0) {
      alert('Nenhum jogador ativo encontrado.');
      return;
    }

    const monthName = new Date().toLocaleString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const date = new Date().toISOString().split('T')[0];

    const batchData = activePlayers.map(player => ({
      type: 'income',
      category: 'monthly_fee',
      amount: parseFloat(amount),
      date: date,
      player_id: player.id,
      description: `Mensalidade - ${capitalizedMonth}`
    }));

    try {
      const response = await fetch('/api/transactions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        fetchData();
        alert(`${activePlayers.length} mensalidades geradas com sucesso!`);
      } else {
        const error = await response.json();
        alert('Erro ao gerar mensalidades: ' + error.error);
      }
    } catch (error) {
      console.error('Error generating fees:', error);
      alert('Erro de conexão ao gerar mensalidades.');
    }
  };

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPenalty.player_id || !newPenalty.reason || !newPenalty.days) return;

    try {
      const response = await fetch('/api/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPenalty,
          days: parseInt(newPenalty.days)
        })
      });

      if (response.ok) {
        setNewPenalty({ player_id: '', reason: '', days: '', date: new Date().toISOString().split('T')[0] });
        fetchData();
        alert('Penalidade aplicada com sucesso!');
      }
    } catch (error) {
      console.error('Error adding penalty:', error);
    }
  };

  const handleDeletePenalty = async (id: number) => {
    if (!confirm('Deseja remover esta penalidade?')) return;
    try {
      const response = await fetch(`/api/penalties/${id}`, { method: 'DELETE' });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error deleting penalty:', error);
    }
  };

  const handleUpdatePenaltyStatus = async (id: number, status: 'pending' | 'paid') => {
    try {
      const response = await fetch(`/api/penalties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error updating penalty status:', error);
    }
  };

  const exportFullDatabase = async () => {
    const { utils, writeFile } = await import('xlsx');
    
    // Transactions Sheet
    const transData = transactions.map(t => ({
      ID: t.id,
      Data: new Date(t.date).toLocaleDateString('pt-BR'),
      Tipo: t.type === 'income' ? 'Entrada' : 'Saída',
      Categoria: t.category,
      Jogador: t.player_name || '-',
      Valor: t.amount,
      Descrição: t.description
    }));

    // Players Sheet
    const playersData = players.map(p => ({
      ID: p.id,
      Nome: p.name,
      Telefone: p.phone,
      WhatsApp: p.whatsapp,
      Cargo: p.role,
      Status: p.status
    }));

    const wb = utils.book_new();
    
    const wsTrans = utils.json_to_sheet(transData);
    utils.book_append_sheet(wb, wsTrans, "Financeiro");
    
    const wsPlayers = utils.json_to_sheet(playersData);
    utils.book_append_sheet(wb, wsPlayers, "Jogadores");

    writeFile(wb, `Banco_Completo_${settings.app_title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPlayersToExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    
    const data = players.map(p => ({
      ID: p.id,
      Nome: p.name,
      Telefone: p.phone,
      WhatsApp: p.whatsapp,
      Cargo: p.role,
      Status: p.status
    }));

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Jogadores");
    writeFile(wb, `Lista_Jogadores_${settings.app_title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/admin/backup';
  };

  const handleSyncDrive = async () => {
    if (!driveUrl) return alert('Insira o link do Google Drive');
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: driveUrl })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemConfig)
      });
      if (res.ok) {
        alert('Configurações do sistema salvas!');
        fetchData();
      }
    } catch (error) {
      alert('Erro ao salvar configurações');
    }
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => {
    const matchesMonth = t.date.startsWith(transactionFilter.month);
    const matchesType = transactionFilter.type === 'all' || t.type === transactionFilter.type;
    return matchesMonth && matchesType;
  });

  const chartData = [
    { name: 'Entradas', value: summary.totalIncome, color: '#10b981' },
    { name: 'Saídas', value: summary.totalExpense, color: '#f43f5e' }
  ];

  const renderDashboard = () => {
    const isMember = userRole === 'member';
    const memberTransactions = isMember ? transactions : [];
    const memberTotalPaid = memberTransactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc, 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            {isMember ? `Olá, ${loggedPlayerName}` : 'Visão Geral'}
          </h2>
          <div className="flex items-center gap-2">
            {isMember && settings.pix_key && (
              <button 
                onClick={() => setShowPix(!showPix)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <QrCode size={14} /> Pagar Mensalidade
              </button>
            )}
            {!isMember && (
              <button 
                onClick={shareSummary}
                className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
              >
                <MessageCircle size={14} /> Compartilhar Resumo
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isMember && showPix && settings.pix_key && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 overflow-hidden mb-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                  <QrCode size={120} className="text-emerald-600" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">QR Code PIX</p>
                </div>
                <div className="space-y-2 w-full max-w-xs">
                  <p className="text-sm font-medium text-emerald-800">Escaneie o código acima ou copie a chave abaixo para pagar sua mensalidade.</p>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-emerald-200">
                    <code className="flex-1 text-xs font-mono text-slate-600 truncate">{settings.pix_key}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(settings.pix_key);
                        alert('Chave PIX copiada!');
                      }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Copiar Chave"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">* Após o pagamento, o tesoureiro confirmará seu lançamento no sistema.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isMember ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-600 font-medium text-sm">Total Pago</span>
                <TrendingUp className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(memberTotalPaid)}</div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900 p-6 rounded-2xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-medium text-sm">Minhas Mensalidades</span>
                <Wallet className="text-emerald-400 w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">{memberTransactions.length} Lançamentos</div>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-600 font-medium text-sm">Entradas</span>
                <TrendingUp className="text-emerald-500 w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalIncome)}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-rose-600 font-medium text-sm">Saídas</span>
                <TrendingDown className="text-rose-500 w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalExpense)}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 p-6 rounded-2xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-medium text-sm">Saldo Total</span>
                <Wallet className="text-emerald-400 w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-white">{formatCurrency(summary.balance)}</div>
            </motion.div>
          </div>
        )}

        {!isMember && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <PieChartIcon size={18} className="text-emerald-600" />
                Distribuição Financeira
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {chartData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                    <span className="text-xs font-medium text-slate-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-600" />
                Comparativo Mensal
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Penalties List */}
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
          <div className="p-4 bg-rose-50/50 border-b border-rose-100 flex justify-between items-center">
            <h3 className="font-semibold text-rose-800 flex items-center gap-2">
              <AlertTriangle size={18} />
              Penalidades Ativas
            </h3>
            {userRole !== 'member' && (
              <button onClick={() => setActiveTab('penalties')} className="text-rose-600 text-sm font-bold">Gerenciar</button>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {penalties.filter(p => p.status === 'pending').slice(0, 5).map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-rose-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-rose-100 text-rose-600">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{p.reason}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(p.date).toLocaleDateString('pt-BR')} • {p.player_name}
                    </div>
                  </div>
                </div>
                <div className="text-rose-600 font-bold text-sm">
                  {p.days} dias
                </div>
              </div>
            ))}
            {penalties.filter(p => p.status === 'pending').length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm italic">Nenhuma penalidade pendente.</div>
            )}
          </div>
        </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">
            {userRole === 'member' ? 'Meus Pagamentos' : 'Últimas Transações'}
          </h3>
          <button onClick={() => setActiveTab('transactions')} className="text-emerald-600 text-sm font-medium">Ver todas</button>
        </div>
        <div className="divide-y divide-slate-50">
          {transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {t.type === 'income' ? <PlusCircle size={18} /> : <MinusCircle size={18} />}
                </div>
                <div>
                  <div className="font-medium text-slate-800 text-sm">{t.description || t.category}</div>
                  <div className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')} {t.player_name ? `• ${t.player_name}` : ''}</div>
                </div>
              </div>
              <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">Nenhuma transação registrada.</div>
          )}
        </div>
      </div>
    </div>
    );
  };

  const renderPenalties = () => {
    if (!isLoggedIn) return renderAdmin();
    if (userRole === 'member') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Minhas Penalidades</h2>
            <button onClick={() => setActiveTab('dashboard')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
              <History size={16} className="rotate-180" /> Voltar
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-50">
              {penalties.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 text-sm">{p.reason}</div>
                      <div className="text-xs text-slate-400">{new Date(p.date).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm font-bold ${p.status === 'paid' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {p.days} dias
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {p.status === 'paid' ? 'Cumprido' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
              {penalties.length === 0 && (
                <div className="p-12 text-center text-slate-400">Você não possui penalidades registradas.</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Gestão de Penalidades</h2>
          <button onClick={() => setActiveTab('dashboard')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
            <History size={16} className="rotate-180" /> Voltar ao Painel
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-rose-600" />
            Aplicar Nova Penalidade
          </h3>
          <form onSubmit={handleAddPenalty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Jogador</label>
              <select 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                value={newPenalty.player_id}
                onChange={(e) => setNewPenalty({...newPenalty, player_id: e.target.value})}
                required
              >
                <option value="">Selecionar Jogador...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo</label>
              <input 
                type="text" 
                placeholder="Ex: Atraso, Falta sem aviso..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                value={newPenalty.reason}
                onChange={(e) => setNewPenalty({...newPenalty, reason: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Dias sem jogar</label>
              <input 
                type="number" 
                placeholder="Ex: 1, 2, 7..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                value={newPenalty.days}
                onChange={(e) => setNewPenalty({...newPenalty, days: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
              <input 
                type="date" 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                value={newPenalty.date}
                onChange={(e) => setNewPenalty({...newPenalty, date: e.target.value})}
                required
              />
            </div>
            <button type="submit" className="md:col-span-2 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-colors">
              Aplicar Penalidade
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Jogador</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Motivo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Dias</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {penalties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.player_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{p.reason}</td>
                    <td className="px-6 py-4 text-sm font-bold text-rose-600">{p.days} dias</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={p.status}
                        onChange={(e) => handleUpdatePenaltyStatus(p.id, e.target.value as 'pending' | 'paid')}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border-none focus:ring-0 cursor-pointer ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                      >
                        <option value="pending">Pendente</option>
                        <option value="paid">Cumprido</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleDeletePenalty(p.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {penalties.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma penalidade registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPlayers = () => {
    const isMember = userRole === 'member';
    const playersToShow = isMember ? players.filter(p => p.id === loggedPlayerId) : filteredPlayers;

    return (
      <div className="space-y-6">
        {(userRole === 'admin' || userRole === 'treasurer') && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-emerald-600" />
              Novo Jogador
            </h3>
            {/* ... form content ... */}
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                  >
                    {newPlayer.photo ? (
                      <img src={newPlayer.photo} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <Camera className="text-slate-400 w-8 h-8" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Foto</span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="text-white w-6 h-6" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'player')} 
                  />
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: João Silva" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input 
                      type="text" 
                      placeholder="(00) 00000-0000" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={newPlayer.phone}
                      onChange={(e) => setNewPlayer({...newPlayer, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Link ou número do WhatsApp" 
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={newPlayer.whatsapp}
                        onChange={(e) => setNewPlayer({...newPlayer, whatsapp: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Senha Individual</label>
                    <input 
                      type="password" 
                      placeholder="Mínimo 6 caracteres" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={newPlayer.password}
                      onChange={(e) => setNewPlayer({...newPlayer, password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo / Nível</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={newPlayer.role}
                      onChange={(e) => setNewPlayer({...newPlayer, role: e.target.value})}
                    >
                      <option value="member">Membro</option>
                      <option value="treasurer">Tesoureiro</option>
                      {userRole === 'admin' && <option value="admin">Administrador</option>}
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                Cadastrar Jogador
              </button>
            </form>
          </div>
        )}

        {isMember && editingPlayer && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Camera size={18} className="text-blue-600" />
                Atualizar Foto de Perfil
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-rose-500">
                <PlusCircle className="rotate-45" size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdatePlayer} className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div 
                  onClick={() => adminPlayerFileInputRef.current?.click()}
                  className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                >
                  {editingPlayer.photo ? (
                    <img src={editingPlayer.photo} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <Camera className="text-slate-400 w-10 h-10" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white w-8 h-8" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={adminPlayerFileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleAdminPlayerFileChange} 
                />
                <p className="text-xs text-slate-500 text-center">Clique no círculo acima para selecionar uma nova foto</p>
                <div className="flex gap-2 w-full">
                  <button 
                    type="button" 
                    onClick={() => setEditingPlayer(null)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Salvar Foto
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-800">
              {isMember ? 'Meu Perfil' : `Lista de Jogadores (${filteredPlayers.length})`}
            </h3>
            {!isMember && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Buscar jogador..." 
                  className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:w-64"
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {playersToShow.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  {p.photo ? (
                    <img src={p.photo} className="w-10 h-10 rounded-full object-cover border border-slate-100" alt={p.name} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{p.phone || 'Sem tel'}</span>
                      {p.whatsapp && (
                        <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline flex items-center gap-0.5">
                          <MessageCircle size={10} /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isMember && (
                    <button 
                      onClick={() => setEditingPlayer(p)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Trocar Foto"
                    >
                      <Camera size={18} />
                    </button>
                  )}
                  {(userRole === 'admin' || userRole === 'treasurer') && (
                    <button 
                      onClick={() => handleDeletePlayer(p.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {playersToShow.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">Nenhum jogador encontrado.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Bell className="text-emerald-600" size={20} />
          Mural de Avisos
        </h3>
      </div>

      {editingNotification && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Settings size={20} className="text-emerald-600" />
            Editar Aviso
          </h3>
          <form onSubmit={handleUpdateNotification} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Título do Aviso</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={editingNotification.title}
                onChange={(e) => setEditingNotification({...editingNotification, title: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mensagem</label>
              <textarea 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24"
                value={editingNotification.message}
                onChange={(e) => setEditingNotification({...editingNotification, message: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Aviso</label>
              <select 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={editingNotification.type}
                onChange={(e) => setEditingNotification({...editingNotification, type: e.target.value})}
              >
                <option value="update">Informativo (Azul)</option>
                <option value="payment">Pagamento (Verde)</option>
                <option value="expense">Despesa (Vermelho)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Imagem do Aviso (Opcional)</label>
              <div className="flex items-center gap-3">
                {editingNotification.image && (
                  <img src={editingNotification.image} className="w-12 h-12 rounded-lg object-cover border border-slate-200" alt="Preview" />
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'notification')}
                  className="flex-1 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                Salvar Alterações
              </button>
              <button 
                type="button" 
                onClick={() => setEditingNotification(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={n.id} 
            className={`p-4 rounded-2xl border ${
              n.type === 'expense' ? 'bg-rose-50 border-rose-100' : 
              n.type === 'payment' ? 'bg-emerald-50 border-emerald-100' : 
              'bg-blue-50 border-blue-100'
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className={`font-bold text-sm ${
                n.type === 'expense' ? 'text-rose-800' : 
                n.type === 'payment' ? 'text-emerald-800' : 
                'text-blue-800'
              }`}>{n.title}</h4>
              <div className="flex items-center gap-2">
                {(userRole === 'admin' || userRole === 'treasurer') && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingNotification(n)}
                      className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Settings size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteNotification(n.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                <span className="text-[10px] font-medium text-slate-400">
                  {new Date(n.date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
            {n.image && (
              <div className="mb-3 rounded-xl overflow-hidden border border-slate-100">
                <img src={n.image} className="w-full h-48 object-cover" alt={n.title} referrerPolicy="no-referrer" />
              </div>
            )}
            <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
          </motion.div>
        ))}
        {notifications.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center">
            <Bell className="mx-auto text-slate-200 mb-2" size={32} />
            <p className="text-sm text-slate-400">Nenhum aviso no momento.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdmin = () => {
    if (!isLoggedIn) {
      return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mt-10">
          <div className="text-center mb-8">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="text-emerald-600 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Área Restrita</h2>
            <p className="text-slate-500 text-sm">Digite a senha para acessar o seu nível de permissão</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="px-2 py-1 bg-slate-100 text-[10px] rounded-full text-slate-500 font-bold">ADMIN</span>
              <span className="px-2 py-1 bg-slate-100 text-[10px] rounded-full text-slate-500 font-bold">TESOUREIRO</span>
              <span className="px-2 py-1 bg-slate-100 text-[10px] rounded-full text-slate-500 font-bold">MEMBRO</span>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Usuário / Nome do Jogador</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Ex: admin ou Seu Nome"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Senha de Acesso</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
              Entrar no Painel
            </button>
          </form>
        </div>
      );
    }

    if (userRole === 'member') {
      return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">
                {loggedPlayerName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{loggedPlayerName}</h2>
                <p className="text-slate-500 text-sm">Acesso de Membro</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
            >
              Sair da Conta
            </button>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
            <h3 className="font-bold text-emerald-800 mb-2">Bem-vindo ao FutGestão!</h3>
            <p className="text-emerald-700 text-sm leading-relaxed mb-4">
              Aqui você pode acompanhar suas mensalidades e atualizar sua foto de perfil. 
            </p>
            
            <div className="bg-white p-4 rounded-xl border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3">Segurança da Conta</h4>
              <form onSubmit={handleMemberChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="Digite sua nova senha"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={memberNewPassword}
                    onChange={(e) => setMemberNewPassword(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors"
                >
                  Alterar Minha Senha
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
              userRole === 'admin' ? 'bg-blue-100 text-blue-600' : 
              userRole === 'treasurer' ? 'bg-emerald-100 text-emerald-600' : 
              'bg-slate-100 text-slate-600'
            }`}>
              {userRole?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800">Acesso: {
                userRole === 'admin' ? 'Administrador' : 
                userRole === 'treasurer' ? 'Tesoureiro' : 'Membro'
              }</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Nível de Permissão Ativo</div>
            </div>
          </div>
          <button onClick={handleLogout} className="text-rose-500 text-xs font-bold hover:underline">Sair do Painel</button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(userRole === 'admin' || userRole === 'treasurer') && (
            <button 
              onClick={() => setActiveTab('admin_players')}
              className="flex flex-col items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm text-center"
            >
              <Users size={20} />
              <span className="text-xs">Gerenciar Membros</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'treasurer') && (
            <button 
              onClick={() => setActiveTab('penalties')}
              className="flex flex-col items-center justify-center gap-2 bg-rose-600 text-white p-4 rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-sm text-center"
            >
              <AlertTriangle size={20} />
              <span className="text-xs">Penalidades</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'treasurer') && (
            <button 
              onClick={handleGenerateMonthlyFees}
              className="flex flex-col items-center justify-center gap-2 bg-emerald-600 text-white p-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-sm text-center"
            >
              <PlusCircle size={20} />
              <span className="text-xs">Gerar Mensalidades</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'treasurer') && (
            <button 
              onClick={exportFullDatabase}
              className="flex flex-col items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-sm text-center"
            >
              <History size={20} />
              <span className="text-xs">Banco Completo (XLSX)</span>
            </button>
          )}
          {(userRole === 'admin' || userRole === 'treasurer') && (
            <button 
              onClick={exportPlayersToExcel}
              className="flex flex-col items-center justify-center gap-2 bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-sm text-center"
            >
              <Users size={20} />
              <span className="text-xs">Lista Jogadores (XLSX)</span>
            </button>
          )}
          {userRole === 'admin' && (
            <button 
              onClick={handleDownloadBackup}
              className="flex flex-col items-center justify-center gap-2 bg-amber-600 text-white p-4 rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-sm text-center"
            >
              <Save size={20} />
              <span className="text-xs">Backup Banco (.db)</span>
            </button>
          )}
        </div>

        {/* Google Drive Sync (Visible to Admin) */}
        {userRole === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Upload size={20} className="text-blue-600" />
                Sincronizar com Google Drive
              </h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Link Compartilhado do Arquivo Excel</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveUrl}
                    onChange={(e) => {
                      setDriveUrl(e.target.value);
                      setSystemConfig({ ...systemConfig, drive_sync_url: e.target.value });
                    }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button 
                    onClick={handleSyncDrive}
                    disabled={isSyncing}
                    className={`px-6 py-2 rounded-xl font-bold text-white transition-all ${isSyncing ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                  <button 
                    onClick={handleUpdateSystemConfig}
                    className="px-6 py-2 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all"
                  >
                    Salvar Link
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 italic">
                * O arquivo deve estar compartilhado como "Qualquer pessoa com o link". As abas devem se chamar "Jogadores" e "Transacoes".
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Settings size={20} className="text-slate-600" />
                Configurações do Sistema (Arquivo config.json)
              </h3>
              <form onSubmit={handleUpdateSystemConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Usuário Admin</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    value={systemConfig.admin_user}
                    onChange={(e) => setSystemConfig({ ...systemConfig, admin_user: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Senha Admin</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    value={systemConfig.admin_pass}
                    onChange={(e) => setSystemConfig({ ...systemConfig, admin_pass: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Intervalo de Sincronização (min)</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    value={systemConfig.sync_interval_minutes}
                    onChange={(e) => setSystemConfig({ ...systemConfig, sync_interval_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-3">
                  <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                    Salvar Credenciais e Intervalo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Financial Entry Form (Visible to Admin and Treasurer) */}
        {(userRole === 'admin' || userRole === 'treasurer') && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <PlusCircle size={20} className="text-emerald-600" />
              Lançamento Financeiro
            </h3>
            <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value as 'income' | 'expense'})}
                >
                  <option value="income">Entrada (Receita)</option>
                  <option value="expense">Saída (Despesa)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                >
                  {newTransaction.type === 'income' ? (
                    <>
                      <option value="monthly_fee">Mensalidade</option>
                      <option value="extra">Extra / Diária</option>
                      <option value="sponsorship">Patrocínio</option>
                    </>
                  ) : (
                    <>
                      <option value="rent">Aluguel de Quadra</option>
                      <option value="equipment">Equipamento / Bola</option>
                      <option value="social">Social / Churrasco</option>
                      <option value="other">Outros</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0,00"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newTransaction.date}
                  onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Jogador Relacionado (Opcional)</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newTransaction.player_id}
                  onChange={(e) => setNewTransaction({...newTransaction, player_id: e.target.value})}
                >
                  <option value="">Nenhum</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição</label>
                <input 
                  type="text" 
                  placeholder="Ex: Pagamento referente a Março"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                />
              </div>
              <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                Confirmar Lançamento
              </button>
            </form>
          </div>
        )}

        {/* Notifications Form (Admin and Treasurer) */}
        {(userRole === 'admin' || userRole === 'treasurer') && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Bell size={20} className="text-emerald-600" />
              Enviar Aviso ao Mural
            </h3>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Título do Aviso</label>
                <input 
                  type="text" 
                  placeholder="Ex: Jogo Confirmado!"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newNotification.title}
                  onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mensagem</label>
                <textarea 
                  placeholder="Digite o conteúdo do aviso..."
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 h-24"
                  value={newNotification.message}
                  onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Aviso</label>
                <select 
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={newNotification.type}
                  onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
                >
                  <option value="update">Informativo (Azul)</option>
                  <option value="payment">Pagamento (Verde)</option>
                  <option value="expense">Despesa (Vermelho)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Imagem do Aviso (Opcional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'notification')}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                Publicar Aviso
              </button>
            </form>
          </div>
        )}

        {/* App Customization (Admin only) */}
        {userRole === 'admin' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Settings size={20} className="text-emerald-600" />
              Personalização e Segurança
            </h3>
            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                  >
                    {settings.app_logo ? (
                      <img src={settings.app_logo} className="w-full h-full object-contain" alt="Logo" />
                    ) : (
                      <ImageIcon className="text-slate-300 w-8 h-8" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="text-white w-6 h-6" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={logoInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'logo')} 
                  />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Logo</span>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Título do Aplicativo</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.app_title}
                      onChange={(e) => setSettings({...settings, app_title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Chave PIX (Mensalidades)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.pix_key}
                      onChange={(e) => setSettings({...settings, pix_key: e.target.value})}
                      placeholder="E-mail, CPF ou Aleatória"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Senha Administrador</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.admin_password}
                      onChange={(e) => setSettings({...settings, admin_password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Senha Tesoureiro</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.treasurer_password}
                      onChange={(e) => setSettings({...settings, treasurer_password: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Senha Membro</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={settings.member_password}
                      onChange={(e) => setSettings({...settings, member_password: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                Salvar Configurações
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  const renderAdminPlayers = () => {
    if (!isLoggedIn) {
      return renderAdmin(); // Show login form
    }

    if (userRole !== 'admin' && userRole !== 'treasurer') {
      return (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
          Você não tem permissão para acessar esta área.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Gestão de Membros</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => excelInputRef.current?.click()}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Upload size={16} />
              Importar Excel
            </button>
            <input 
              type="file" 
              ref={excelInputRef} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleImportExcel} 
            />
            <button 
              onClick={() => setActiveTab('admin')}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium"
            >
              <History size={16} className="rotate-180" /> Voltar ao Painel
            </button>
          </div>
        </div>

        {editingPlayer && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-blue-600" />
                Editando: {editingPlayer.name}
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-rose-500">
                <PlusCircle className="rotate-45" size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdatePlayer} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div 
                    onClick={() => adminPlayerFileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-blue-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
                  >
                    {editingPlayer.photo ? (
                      <img src={editingPlayer.photo} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <Camera className="text-slate-400 w-8 h-8" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="text-white w-6 h-6" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={adminPlayerFileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleAdminPlayerFileChange} 
                  />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editingPlayer.name}
                      onChange={(e) => setEditingPlayer({...editingPlayer, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editingPlayer.phone}
                      onChange={(e) => setEditingPlayer({...editingPlayer, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nível de Acesso</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editingPlayer.role}
                      onChange={(e) => setEditingPlayer({...editingPlayer, role: e.target.value as any})}
                    >
                      {userRole === 'admin' && <option value="admin">Administrador</option>}
                      <option value="treasurer">Tesoureiro</option>
                      <option value="member">Membro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editingPlayer.status}
                      onChange={(e) => setEditingPlayer({...editingPlayer, status: e.target.value})}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editingPlayer.whatsapp}
                      onChange={(e) => setEditingPlayer({...editingPlayer, whatsapp: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Senha de Acesso</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={editingPlayer.password}
                      onChange={(e) => setEditingPlayer({...editingPlayer, password: e.target.value})}
                      placeholder="Nova senha"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                  Salvar Alterações
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingPlayer(null)}
                  className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-800">Membros Cadastrados ({players.length})</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Filtrar membros..." 
                className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:w-64"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {filteredPlayers.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  {p.photo ? (
                    <img src={p.photo} className="w-12 h-12 rounded-xl object-cover border border-slate-100" alt={p.name} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      {p.name}
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        p.role === 'admin' ? 'bg-blue-100 text-blue-600' : 
                        p.role === 'treasurer' ? 'bg-emerald-100 text-emerald-600' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {p.role}
                      </span>
                      {p.status === 'inactive' && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 font-bold uppercase">Inativo</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{p.phone || 'Sem telefone'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingPlayer(p)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar Informações"
                  >
                    <Settings size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeletePlayer(p.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Excluir Membro"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {filteredPlayers.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">Nenhum membro encontrado.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderManual = () => (
    <div className="space-y-8 pb-12">
      <div className="bg-emerald-600 p-8 rounded-3xl text-white">
        <h2 className="text-3xl font-bold mb-2">Manual de Utilização</h2>
        <p className="opacity-90">Bem-vindo ao FutGestão! Aprenda a gerenciar seu grupo de futebol de forma profissional.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <LayoutDashboard className="text-emerald-600" size={20} />
            1. Dashboard (Início)
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            A tela inicial oferece uma visão rápida das finanças do grupo. Você pode ver o total de <strong>Entradas</strong>, 
            <strong>Saídas</strong> e o <strong>Saldo Atual</strong>. Utilize os gráficos para analisar a saúde financeira mensal.
            O botão "Compartilhar Resumo" permite enviar o status financeiro diretamente no grupo do WhatsApp.
          </p>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="text-emerald-600" size={20} />
            2. Gestão de Jogadores
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Cadastre todos os membros do grupo. É possível adicionar nome, telefone, link de WhatsApp e uma foto de perfil.
            A busca rápida facilita encontrar jogadores em grupos grandes. Clique no ícone de lixeira para remover um jogador.
          </p>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History className="text-emerald-600" size={20} />
            3. Extrato e Filtros
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Visualize todo o histórico de movimentações. Use os filtros de <strong>Mês</strong> e <strong>Tipo</strong> para 
            encontrar lançamentos específicos. Cada transação possui um botão de compartilhamento para enviar o comprovante individual via WhatsApp.
          </p>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Settings className="text-emerald-600" size={20} />
            4. Área Administrativa
          </h3>
          <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
            <li><strong>Lançamentos:</strong> Registre mensalidades (Entradas) ou despesas como aluguel de quadra (Saídas).</li>
            <li><strong>Notificações:</strong> Envie avisos manuais para todos os membros (ex: "Jogo confirmado para amanhã").</li>
            <li><strong>Personalização:</strong> Altere o nome do app e o logo do seu grupo.</li>
            <li><strong>Importação Excel:</strong> Na Gestão de Membros, você pode carregar vários jogadores de uma vez usando um arquivo Excel (.xlsx). As colunas devem ser: <code>name</code>, <code>phone</code>, <code>whatsapp</code>, <code>role</code>, <code>password</code>, <code>status</code>.</li>
            <li><strong>Banco de Dados:</strong> Configure conexões externas se desejar migrar os dados do SQLite local.</li>
          </ul>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Bell className="text-emerald-600" size={20} />
            5. Mural de Avisos
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Fique atento à aba de Avisos. O sistema gera notificações automáticas para novas despesas e o administrador pode 
            publicar comunicados importantes aqui.
          </p>
        </section>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.app_logo ? (
              <img src={settings.app_logo} className="w-8 h-8 object-contain" alt="Logo" />
            ) : (
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Wallet className="text-white w-5 h-5" />
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight text-slate-800">{settings.app_title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <>
                <button 
                  onClick={() => setActiveTab('manual')}
                  className={`p-2 transition-colors ${activeTab === 'manual' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Manual de Utilização"
                >
                  <History size={20} className="rotate-180" />
                </button>
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className="relative p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Bell size={20} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
              </>
            )}
            <div className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
              Grupo de Futebol
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && isLoggedIn && renderDashboard()}
              {activeTab === 'players' && isLoggedIn && renderPlayers()}
              {activeTab === 'transactions' && isLoggedIn && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex items-center gap-2 flex-1 w-full">
                      <Calendar size={18} className="text-slate-400" />
                      <input 
                        type="month" 
                        className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        value={transactionFilter.month}
                        onChange={(e) => setTransactionFilter({...transactionFilter, month: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Filter size={18} className="text-slate-400" />
                      <select 
                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full"
                        value={transactionFilter.type}
                        onChange={(e) => setTransactionFilter({...transactionFilter, type: e.target.value})}
                      >
                        <option value="all">Todos os tipos</option>
                        <option value="income">Apenas Entradas</option>
                        <option value="expense">Apenas Saídas</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50">
                      <h3 className="font-semibold text-slate-800">Histórico de Transações ({filteredTransactions.length})</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {filteredTransactions.map((t) => (
                        <div key={t.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                              {t.type === 'income' ? <PlusCircle size={18} /> : <MinusCircle size={18} />}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800 text-sm">{t.description || t.category}</div>
                              <div className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')} {t.player_name ? `• ${t.player_name}` : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </div>
                            <button 
                              onClick={() => sharePayment(t)}
                              className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                              title="Compartilhar no WhatsApp"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <div className="p-12 text-center text-slate-400 text-sm">Nenhuma transação encontrada para este filtro.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'penalties' && isLoggedIn && renderPenalties()}
              {activeTab === 'admin' && renderAdmin()}
              {activeTab === 'manual' && isLoggedIn && renderManual()}
              {activeTab === 'admin_players' && isLoggedIn && renderAdminPlayers()}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around z-20 shadow-lg md:max-w-md md:mx-auto md:rounded-t-3xl">
        <button 
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'notifications' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Bell size={22} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Mural</span>
        </button>
        {isLoggedIn && (
          <>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutDashboard size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
            </button>
            <button 
              onClick={() => setActiveTab('players')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'players' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Jogadores</span>
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'transactions' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <History size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Extrato</span>
            </button>
          </>
        )}
        {(userRole === 'admin' || userRole === 'treasurer' || !isLoggedIn) && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'admin' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Settings size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Painel</span>
          </button>
        )}
        {isLoggedIn && (
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-600 transition-colors"
          >
            <MinusCircle size={22} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
          </button>
        )}
      </nav>
    </div>
  );
}
