import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Link as LinkIcon, 
  MessageSquare, 
  Send, 
  Mail, 
  Sparkles, 
  Swords, 
  Users, 
  Smartphone 
} from 'lucide-react';
import { copyToClipboard, getDuelShareUrl, shareDuelNative } from '../lib/clipboard';
import { playKeyClick } from '../lib/audio';

interface DuelShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  textTitle: string;
}

export const DuelShareModal: React.FC<DuelShareModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  textTitle
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullInvite, setCopiedFullInvite] = useState(false);
  const shareUrl = getDuelShareUrl(roomCode);

  if (!isOpen) return null;

  const fullInviteMessage = `⚡ Viens m'affronter en duel de frappe 1v1 sur TypeFlow Pro !
🎮 Code de salon : ${roomCode}
🔗 Lien direct : ${shareUrl}
(Va dans l'onglet Duel et entre le code, ou clique simplement sur le lien !)`;

  const handleCopyCodeOnly = async () => {
    playKeyClick('c');
    const success = await copyToClipboard(roomCode);
    if (success) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleCopyFullLink = async () => {
    playKeyClick('l');
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyFullInvite = async () => {
    playKeyClick('i');
    const success = await copyToClipboard(fullInviteMessage);
    if (success) {
      setCopiedFullInvite(true);
      setTimeout(() => setCopiedFullInvite(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    playKeyClick('s');
    const shared = await shareDuelNative(roomCode, textTitle);
    if (!shared) {
      handleCopyFullInvite();
    }
  };

  const shareText = encodeURIComponent(fullInviteMessage);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`⚡ Défi Duel 1v1 TypeFlow Pro ! Code : ${roomCode}`)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`Défi Duel 1v1 TypeFlow Pro : ${roomCode}`)}&body=${shareText}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col gap-6"
        >
          {/* Ambient decorative glow */}
          <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
                <Swords size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  Inviter un Adversaire
                </h3>
                <p className="text-xs text-slate-400">
                  Partagez le code ou le lien pour démarrer le duel
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Large Room Code Display Box */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex flex-col items-center justify-center gap-3 text-center shadow-inner relative overflow-hidden group">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Code du Salon 1v1
            </div>

            <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 select-all">
              {roomCode}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <button
                onClick={handleCopyCodeOnly}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {copiedCode ? (
                  <>
                    <Check size={16} className="text-emerald-400 animate-bounce" />
                    <span className="text-emerald-400">Code Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copier le Code ({roomCode})</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopyFullInvite}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {copiedFullInvite ? (
                  <>
                    <Check size={16} className="text-emerald-400 animate-bounce" />
                    <span className="text-emerald-400">Message d'invitation Copié !</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} />
                    <span>Copier l'Invitation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Link Share Section */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <LinkIcon size={14} className="text-amber-400" />
                <span>Lien public d'accès direct au duel :</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Public (accessible à tous)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-slate-300 font-mono text-xs truncate select-all">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyFullLink}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-emerald-300" />
                    <span>Lien Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copier Lien</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social / Messaging Direct Buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400">
              Partager en 1 clic :
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playKeyClick('w')}
                className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm text-center"
              >
                <MessageSquare size={16} className="text-emerald-400" />
                <span>WhatsApp</span>
              </a>

              {/* Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playKeyClick('t')}
                className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-2xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-500/30 text-sky-400 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm text-center"
              >
                <Send size={16} className="text-sky-400" />
                <span>Telegram</span>
              </a>

              {/* Email or Native Share */}
              {typeof navigator !== 'undefined' && 'share' in navigator ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-400 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm text-center"
                >
                  <Smartphone size={16} className="text-purple-400" />
                  <span>Partager...</span>
                </button>
              ) : (
                <a
                  href={mailUrl}
                  onClick={() => playKeyClick('m')}
                  className="flex flex-col sm:flex-row items-center justify-center gap-2 p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-400 font-bold text-xs transition-all cursor-pointer active:scale-95 shadow-sm text-center"
                >
                  <Mail size={16} className="text-purple-400" />
                  <span>Email</span>
                </a>
              )}
            </div>
          </div>

          {/* Quick instructions guide */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3 text-[11px] text-slate-400 leading-relaxed">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Comment jouer ensemble :</strong> Dès que votre adversaire ouvre le lien ou saisit le code <strong className="text-amber-400 font-mono">{roomCode}</strong>, il apparaîtra en direct dans votre salon. Vous n'aurez plus qu'à cliquer sur <strong className="text-emerald-400">"Je suis Prêt !"</strong> pour lancer la course !
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
