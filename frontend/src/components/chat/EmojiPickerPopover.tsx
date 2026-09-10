'use strict';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Sparkles, Clock, Smile, ThumbsUp, Flame, Laptop, Coffee, Rocket, Heart } from 'lucide-react';

interface EmojiData {
  emoji: string;
  name: string;
  category: string;
  keywords: string[];
}

const EMOJI_DATABASE: EmojiData[] = [
  // Smileys & Emotions
  { emoji: '😀', name: 'Grinning Face', category: 'smileys', keywords: ['smile', 'happy', 'grin'] },
  { emoji: '😃', name: 'Smiling Face with Big Eyes', category: 'smileys', keywords: ['happy', 'joy', 'smile'] },
  { emoji: '😄', name: 'Smiling Face with Smiling Eyes', category: 'smileys', keywords: ['laugh', 'happy', 'glad'] },
  { emoji: '😁', name: 'Beaming Face', category: 'smileys', keywords: ['teeth', 'grin', 'smile'] },
  { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys', keywords: ['laugh', 'haha', 'hilarious'] },
  { emoji: '😅', name: 'Sweat Smile', category: 'smileys', keywords: ['sweat', 'phew', 'relief', 'nervous'] },
  { emoji: '🤣', name: 'Rolling on Floor Laughing', category: 'smileys', keywords: ['rofl', 'lmao', 'laugh', 'lol'] },
  { emoji: '😂', name: 'Face with Tears of Joy', category: 'smileys', keywords: ['cry', 'joy', 'laugh', 'lol'] },
  { emoji: '🙂', name: 'Slightly Smiling Face', category: 'smileys', keywords: ['smile', 'pleasant', 'mild'] },
  { emoji: '🙃', name: 'Upside-Down Face', category: 'smileys', keywords: ['sarcasm', 'silly', 'irony'] },
  { emoji: '😉', name: 'Winking Face', category: 'smileys', keywords: ['wink', 'flirt', 'joke'] },
  { emoji: '😊', name: 'Smiling Face with Blushing Eyes', category: 'smileys', keywords: ['blush', 'warm', 'happy'] },
  { emoji: '😇', name: 'Smiling Face with Halo', category: 'smileys', keywords: ['angel', 'innocent', 'halo'] },
  { emoji: '🥰', name: 'Smiling Face with Hearts', category: 'smileys', keywords: ['love', 'adore', 'crush'] },
  { emoji: '😍', name: 'Heart Eyes', category: 'smileys', keywords: ['love', 'infatuation', 'eyes', 'heart'] },
  { emoji: '🤩', name: 'Star-Struck', category: 'smileys', keywords: ['wow', 'stars', 'excited', 'amazed'] },
  { emoji: '😘', name: 'Face Blowing a Kiss', category: 'smileys', keywords: ['kiss', 'love', 'muah'] },
  { emoji: '😋', name: 'Face Savoring Food', category: 'smileys', keywords: ['yum', 'delicious', 'tongue', 'tasty'] },
  { emoji: '😛', name: 'Face with Tongue', category: 'smileys', keywords: ['playful', 'silly', 'tongue'] },
  { emoji: '😜', name: 'Winking Face with Tongue', category: 'smileys', keywords: ['joke', 'wacko', 'crazy', 'party'] },
  { emoji: '🤪', name: 'Zany Face', category: 'smileys', keywords: ['wild', 'crazy', 'goofy'] },
  { emoji: '😝', name: 'Squinting Face with Tongue', category: 'smileys', keywords: ['playful', 'taste', 'tongue'] },
  { emoji: '🤑', name: 'Money-Mouth Face', category: 'smileys', keywords: ['cash', 'rich', 'dollar', 'money'] },
  { emoji: '🤗', name: 'Smiling Face with Open Hands', category: 'smileys', keywords: ['hug', 'embrace', 'warm'] },
  { emoji: '🤭', name: 'Face with Hand Over Mouth', category: 'smileys', keywords: ['oops', 'giggle', 'secret'] },
  { emoji: '🤫', name: 'Shushing Face', category: 'smileys', keywords: ['quiet', 'secret', 'shh', 'hush'] },
  { emoji: '🤔', name: 'Thinking Face', category: 'smileys', keywords: ['think', 'ponder', 'idea', 'wonder'] },
  { emoji: '🤐', name: 'Zipper-Mouth Face', category: 'smileys', keywords: ['secret', 'sealed', 'quiet'] },
  { emoji: '🤨', name: 'Face with Raised Eyebrow', category: 'smileys', keywords: ['skeptic', 'doubt', 'suspicious'] },
  { emoji: '😐', name: 'Neutral Face', category: 'smileys', keywords: ['poker face', 'neutral', 'okay'] },
  { emoji: '😑', name: 'Expressionless Face', category: 'smileys', keywords: ['blank', 'unimpressed', 'meh'] },
  { emoji: '😶', name: 'Face Without Mouth', category: 'smileys', keywords: ['silent', 'mute', 'blank'] },
  { emoji: '😏', name: 'Smirking Face', category: 'smileys', keywords: ['smirk', 'cool', 'flirt', 'sly'] },
  { emoji: '😒', name: 'Unamused Face', category: 'smileys', keywords: ['bored', 'annoyed', 'displeased'] },
  { emoji: '🙄', name: 'Face with Rolling Eyes', category: 'smileys', keywords: ['eyeroll', 'frustrated', 'annoyed'] },
  { emoji: '😬', name: 'Grimacing Face', category: 'smileys', keywords: ['awkward', 'nervous', 'ouch'] },
  { emoji: '🤥', name: 'Lying Face', category: 'smileys', keywords: ['pinocchio', 'lie', 'fib'] },
  { emoji: '😌', name: 'Relieved Face', category: 'smileys', keywords: ['peace', 'relief', 'calm'] },
  { emoji: '😔', name: 'Pensive Face', category: 'smileys', keywords: ['sad', 'thoughtful', 'somber'] },
  { emoji: '😪', name: 'Sleepy Face', category: 'smileys', keywords: ['tired', 'sleep', 'rest'] },
  { emoji: '🤤', name: 'Drooling Face', category: 'smileys', keywords: ['craving', 'drool', 'delicious'] },
  { emoji: '😴', name: 'Sleeping Face', category: 'smileys', keywords: ['zzz', 'night', 'sleep'] },
  { emoji: '😷', name: 'Face with Medical Mask', category: 'smileys', keywords: ['mask', 'sick', 'doctor'] },
  { emoji: '🤒', name: 'Face with Thermometer', category: 'smileys', keywords: ['fever', 'ill', 'sick'] },
  { emoji: '🤕', name: 'Face with Head-Bandage', category: 'smileys', keywords: ['hurt', 'injury', 'bandaged'] },
  { emoji: '🤢', name: 'Nauseated Face', category: 'smileys', keywords: ['gross', 'sick', 'disgust'] },
  { emoji: '🤮', name: 'Face Vomiting', category: 'smileys', keywords: ['puke', 'vomit', 'ill'] },
  { emoji: '🤧', name: 'Sneezing Face', category: 'smileys', keywords: ['sneeze', 'cold', 'tissue'] },
  { emoji: '🥵', name: 'Hot Face', category: 'smileys', keywords: ['heat', 'sweat', 'spicy', 'hot'] },
  { emoji: '🥶', name: 'Cold Face', category: 'smileys', keywords: ['freezing', 'ice', 'shiver'] },
  { emoji: '🥴', name: 'Woozy Face', category: 'smileys', keywords: ['dizzy', 'intoxicated', 'groggy'] },
  { emoji: '😵', name: 'Dizzy Face', category: 'smileys', keywords: ['stunned', 'knockout', 'dazed'] },
  { emoji: '🤯', name: 'Exploding Head', category: 'smileys', keywords: ['mind blown', 'shocked', 'boom', 'insane'] },
  { emoji: '🤠', name: 'Cowboy Hat Face', category: 'smileys', keywords: ['sheriff', 'western', 'howdy'] },
  { emoji: '🥳', name: 'Partying Face', category: 'smileys', keywords: ['celebrate', 'party', 'cheer', 'birthday'] },
  { emoji: '😎', name: 'Smiling Face with Sunglasses', category: 'smileys', keywords: ['cool', 'chill', 'sunglasses', 'swag'] },
  { emoji: '🤓', name: 'Nerd Face', category: 'smileys', keywords: ['geek', 'smart', 'glasses', 'nerd'] },
  { emoji: '🧐', name: 'Face with Monocle', category: 'smileys', keywords: ['inspect', 'curious', 'analyze'] },

  // Gestures & People
  { emoji: '👍', name: 'Thumbs Up', category: 'gestures', keywords: ['like', 'approve', 'yes', 'great', 'good'] },
  { emoji: '👎', name: 'Thumbs Down', category: 'gestures', keywords: ['dislike', 'no', 'bad'] },
  { emoji: '👌', name: 'OK Hand', category: 'gestures', keywords: ['perfect', 'okay', 'great', 'fine'] },
  { emoji: '✌️', name: 'Victory / Peace Hand', category: 'gestures', keywords: ['peace', 'victory', 'two'] },
  { emoji: '🤞', name: 'Crossed Fingers', category: 'gestures', keywords: ['luck', 'hope', 'wish'] },
  { emoji: '🤟', name: 'Love-You Gesture', category: 'gestures', keywords: ['love', 'ily', 'rock'] },
  { emoji: '🤘', name: 'Sign of the Horns', category: 'gestures', keywords: ['rock', 'metal', 'horns'] },
  { emoji: '🤙', name: 'Call Me Hand', category: 'gestures', keywords: ['shaka', 'phone', 'hang loose'] },
  { emoji: '👈', name: 'Backhand Index Pointing Left', category: 'gestures', keywords: ['left', 'point'] },
  { emoji: '👉', name: 'Backhand Index Pointing Right', category: 'gestures', keywords: ['right', 'point'] },
  { emoji: '👆', name: 'Backhand Index Pointing Up', category: 'gestures', keywords: ['up', 'point'] },
  { emoji: '👇', name: 'Backhand Index Pointing Down', category: 'gestures', keywords: ['down', 'point'] },
  { emoji: '☝️', name: 'Index Pointing Up', category: 'gestures', keywords: ['one', 'first', 'point'] },
  { emoji: '✋', name: 'Raised Hand', category: 'gestures', keywords: ['stop', 'high five', 'hand'] },
  { emoji: '🤚', name: 'Raised Back of Hand', category: 'gestures', keywords: ['hand', 'back'] },
  { emoji: '🖐️', name: 'Hand with Fingers Splayed', category: 'gestures', keywords: ['five', 'hand'] },
  { emoji: '🖖', name: 'Vulcan Salute', category: 'gestures', keywords: ['spock', 'star trek', 'live long'] },
  { emoji: '👋', name: 'Waving Hand', category: 'gestures', keywords: ['hello', 'hi', 'bye', 'wave'] },
  { emoji: '🤝', name: 'Handshake', category: 'gestures', keywords: ['deal', 'agree', 'partner', 'meet'] },
  { emoji: '👏', name: 'Clapping Hands', category: 'gestures', keywords: ['applause', 'bravo', 'congrats', 'clap'] },
  { emoji: '🙌', name: 'Raising Hands', category: 'gestures', keywords: ['celebrate', 'praise', 'hooray'] },
  { emoji: '👐', name: 'Open Hands', category: 'gestures', keywords: ['open', 'hug', 'welcome'] },
  { emoji: '🤲', name: 'Palms Up Together', category: 'gestures', keywords: ['prayer', 'duas', 'open'] },
  { emoji: '🙏', name: 'Folded Hands', category: 'gestures', keywords: ['thank you', 'please', 'pray', 'namaste', 'hope'] },
  { emoji: '✍️', name: 'Writing Hand', category: 'gestures', keywords: ['write', 'author', 'pen', 'draw'] },
  { emoji: '💪', name: 'Flexed Biceps', category: 'gestures', keywords: ['strong', 'muscle', 'power', 'gym', 'flex'] },
  { emoji: '🦾', name: 'Mechanical Arm', category: 'gestures', keywords: ['robot', 'cyber', 'prosthetic'] },

  // Vibe, Sparks & Reaction
  { emoji: '🔥', name: 'Fire', category: 'vibe', keywords: ['hot', 'lit', 'fire', 'trending', 'burn'] },
  { emoji: '✨', name: 'Sparkles', category: 'vibe', keywords: ['magic', 'shine', 'special', 'clean', 'ai', 'spark'] },
  { emoji: '⭐', name: 'Star', category: 'vibe', keywords: ['favorite', 'rating', 'shine'] },
  { emoji: '🌟', name: 'Glowing Star', category: 'vibe', keywords: ['bright', 'gold', 'shine'] },
  { emoji: '💫', name: 'Dizzy Star', category: 'vibe', keywords: ['sparkle', 'magic', 'shooting star'] },
  { emoji: '⚡', name: 'High Voltage / Zap', category: 'vibe', keywords: ['fast', 'speed', 'thunder', 'lightning', 'energy'] },
  { emoji: '💥', name: 'Collision', category: 'vibe', keywords: ['boom', 'explode', 'impact', 'wow'] },
  { emoji: '🎉', name: 'Party Popper', category: 'vibe', keywords: ['celebration', 'tada', 'congrats', 'party'] },
  { emoji: '🎊', name: 'Confetti Ball', category: 'vibe', keywords: ['festive', 'party', 'fun'] },
  { emoji: '🎈', name: 'Balloon', category: 'vibe', keywords: ['birthday', 'celebration', 'fly'] },
  { emoji: '🏆', name: 'Trophy', category: 'vibe', keywords: ['winner', 'champion', 'first', 'award'] },
  { emoji: '🥇', name: '1st Place Medal', category: 'vibe', keywords: ['gold', 'first', 'champion'] },
  { emoji: '💎', name: 'Gem Stone', category: 'vibe', keywords: ['diamond', 'luxury', 'precious', 'crystal'] },
  { emoji: '💡', name: 'Light Bulb', category: 'vibe', keywords: ['idea', 'insight', 'smart', 'bright'] },
  { emoji: '🔮', name: 'Crystal Ball', category: 'vibe', keywords: ['future', 'magic', 'predict'] },
  { emoji: '🎯', name: 'Direct Hit / Bullseye', category: 'vibe', keywords: ['goal', 'target', 'accuracy', 'focus'] },
  { emoji: '💯', name: 'Hundred Points', category: 'vibe', keywords: ['perfect', '100', 'score', 'keep it 100'] },

  // Tech, Coding & Work
  { emoji: '💻', name: 'Laptop', category: 'tech', keywords: ['computer', 'code', 'dev', 'work', 'tech'] },
  { emoji: '🖥️', name: 'Desktop Computer', category: 'tech', keywords: ['screen', 'pc', 'monitor'] },
  { emoji: '🤖', name: 'Robot Face', category: 'tech', keywords: ['ai', 'bot', 'automaton', 'cyber'] },
  { emoji: '📱', name: 'Mobile Phone', category: 'tech', keywords: ['iphone', 'smartphone', 'call'] },
  { emoji: '🕹️', name: 'Joystick', category: 'tech', keywords: ['gaming', 'game', 'play'] },
  { emoji: '💾', name: 'Floppy Disk', category: 'tech', keywords: ['save', 'storage', 'vintage'] },
  { emoji: '⚙️', name: 'Gear', category: 'tech', keywords: ['settings', 'config', 'cog', 'mechanism'] },
  { emoji: '🔧', name: 'Wrench', category: 'tech', keywords: ['tool', 'fix', 'repair', 'build'] },
  { emoji: '🔨', name: 'Hammer', category: 'tech', keywords: ['build', 'construct', 'craft'] },
  { emoji: '📦', name: 'Package', category: 'tech', keywords: ['npm', 'box', 'delivery', 'module'] },
  { emoji: '📊', name: 'Bar Chart', category: 'tech', keywords: ['stats', 'analytics', 'growth'] },
  { emoji: '📈', name: 'Chart Increasing', category: 'tech', keywords: ['growth', 'stocks', 'success', 'up'] },
  { emoji: '🔍', name: 'Magnifying Glass', category: 'tech', keywords: ['search', 'find', 'explore'] },
  { emoji: '🔒', name: 'Locked', category: 'tech', keywords: ['security', 'safe', 'privacy', 'secret'] },
  { emoji: '🔓', name: 'Unlocked', category: 'tech', keywords: ['access', 'open', 'security'] },
  { emoji: '🛡️', name: 'Shield', category: 'tech', keywords: ['security', 'guard', 'protection'] },
  { emoji: '🧠', name: 'Brain', category: 'tech', keywords: ['mind', 'ai', 'intelligence', 'think'] },
  { emoji: '📚', name: 'Books', category: 'tech', keywords: ['reading', 'learning', 'study', 'docs'] },
  { emoji: '📝', name: 'Memo', category: 'tech', keywords: ['note', 'document', 'write'] },
  { emoji: '🎨', name: 'Artist Palette', category: 'tech', keywords: ['design', 'art', 'draw', 'creative'] },

  // Food & Drinks
  { emoji: '☕', name: 'Hot Beverage', category: 'food', keywords: ['coffee', 'tea', 'caffeine', 'break'] },
  { emoji: '🍵', name: 'Teacup Without Handle', category: 'food', keywords: ['green tea', 'matcha'] },
  { emoji: '🍕', name: 'Pizza', category: 'food', keywords: ['food', 'slice', 'dinner'] },
  { emoji: '🍔', name: 'Hamburger', category: 'food', keywords: ['burger', 'fast food'] },
  { emoji: '🍟', name: 'French Fries', category: 'food', keywords: ['fries', 'snack'] },
  { emoji: '🍩', name: 'Doughnut', category: 'food', keywords: ['donut', 'sweet', 'dessert'] },
  { emoji: '🍿', name: 'Popcorn', category: 'food', keywords: ['movie', 'snack', 'fun'] },
  { emoji: '🍫', name: 'Chocolate Bar', category: 'food', keywords: ['sweet', 'treat', 'cocoa'] },
  { emoji: '🍎', name: 'Red Apple', category: 'food', keywords: ['fruit', 'healthy', 'apple'] },
  { emoji: '🥑', name: 'Avocado', category: 'food', keywords: ['healthy', 'green'] },
  { emoji: '🍻', name: 'Clinking Beer Mugs', category: 'food', keywords: ['cheers', 'drink', 'celebrate'] },

  // Travel, Space & Places
  { emoji: '🚀', name: 'Rocket', category: 'travel', keywords: ['launch', 'ship', 'fast', 'space', 'speed'] },
  { emoji: '🛸', name: 'Flying Saucer', category: 'travel', keywords: ['ufo', 'alien', 'sci-fi'] },
  { emoji: '🌍', name: 'Globe Europe-Africa', category: 'travel', keywords: ['earth', 'world', 'planet', 'global'] },
  { emoji: '🌎', name: 'Globe Americas', category: 'travel', keywords: ['world', 'earth', 'global'] },
  { emoji: '🌏', name: 'Globe Asia-Australia', category: 'travel', keywords: ['world', 'earth', 'asia'] },
  { emoji: '✈️', name: 'Airplane', category: 'travel', keywords: ['flight', 'travel', 'trip'] },
  { emoji: '🚗', name: 'Automobile', category: 'travel', keywords: ['car', 'drive'] },
  { emoji: '🏎️', name: 'Racing Car', category: 'travel', keywords: ['fast', 'f1', 'speed'] },
  { emoji: '🏖️', name: 'Beach with Umbrella', category: 'travel', keywords: ['vacation', 'summer', 'relax'] },
  { emoji: '🏔️', name: 'Snow-Capped Mountain', category: 'travel', keywords: ['nature', 'peak', 'hike'] },

  // Hearts & Symbols
  { emoji: '❤️', name: 'Red Heart', category: 'hearts', keywords: ['love', 'like', 'heart', 'affection'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'hearts', keywords: ['love', 'orange'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'hearts', keywords: ['friendship', 'yellow', 'love'] },
  { emoji: '💚', name: 'Green Heart', category: 'hearts', keywords: ['nature', 'green', 'love'] },
  { emoji: '💙', name: 'Blue Heart', category: 'hearts', keywords: ['trust', 'blue', 'love'] },
  { emoji: '💜', name: 'Purple Heart', category: 'hearts', keywords: ['purple', 'love'] },
  { emoji: '🖤', name: 'Black Heart', category: 'hearts', keywords: ['dark', 'black', 'love'] },
  { emoji: '🤍', name: 'White Heart', category: 'hearts', keywords: ['pure', 'white', 'love'] },
  { emoji: '💖', name: 'Sparkling Heart', category: 'hearts', keywords: ['love', 'magic', 'sparkle'] },
  { emoji: '💗', name: 'Growing Heart', category: 'hearts', keywords: ['pulse', 'love', 'excited'] },
  { emoji: '💓', name: 'Beating Heart', category: 'hearts', keywords: ['heartbeat', 'alive', 'love'] },
  { emoji: '💞', name: 'Revolving Hearts', category: 'hearts', keywords: ['love', 'romance'] },
  { emoji: '💘', name: 'Heart with Arrow', category: 'hearts', keywords: ['cupid', 'crush', 'fall in love'] },
  { emoji: '💔', name: 'Broken Heart', category: 'hearts', keywords: ['sad', 'breakup', 'heartbroken'] },
  { emoji: '✅', name: 'Check Mark Button', category: 'hearts', keywords: ['done', 'correct', 'verify', 'ok', 'pass'] },
  { emoji: '❌', name: 'Cross Mark', category: 'hearts', keywords: ['no', 'wrong', 'fail', 'cancel'] },
  { emoji: '⚠️', name: 'Warning', category: 'hearts', keywords: ['caution', 'alert', 'danger'] },
  { emoji: '🚨', name: 'Police Car Light', category: 'hearts', keywords: ['emergency', 'siren', 'critical'] },
  { emoji: '❓', name: 'Question Mark', category: 'hearts', keywords: ['ask', 'query', 'why'] },
  { emoji: '❗', name: 'Exclamation Mark', category: 'hearts', keywords: ['important', 'alert', 'notice'] },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'smileys', label: 'Smileys', icon: Smile },
  { id: 'gestures', label: 'Hands', icon: ThumbsUp },
  { id: 'vibe', label: 'Vibe', icon: Flame },
  { id: 'tech', label: 'Tech', icon: Laptop },
  { id: 'food', label: 'Food', icon: Coffee },
  { id: 'travel', label: 'Travel', icon: Rocket },
  { id: 'hearts', label: 'Symbols', icon: Heart },
];

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  onSelectEmoji,
  onClose,
  className = '',
}) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiData | null>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recently used emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('phantom_recent_emojis');
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      } else {
        setRecentEmojis(['✨', '🚀', '🔥', '💡', '👍', '❤️', '🎉', '🤖']);
      }
    } catch {
      setRecentEmojis(['✨', '🚀', '🔥', '💡', '👍', '❤️', '🎉', '🤖']);
    }
  }, []);

  // Autofocus search on open
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, []);

  const handlePick = (emoji: string) => {
    // Update recents
    try {
      const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 16);
      setRecentEmojis(updated);
      localStorage.setItem('phantom_recent_emojis', JSON.stringify(updated));
    } catch {}

    onSelectEmoji(emoji);
  };

  const filteredEmojis = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      if (activeCategory === 'all') return EMOJI_DATABASE;
      return EMOJI_DATABASE.filter((e) => e.category === activeCategory);
    }
    return EMOJI_DATABASE.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q)) ||
        e.emoji.includes(q)
    );
  }, [searchQuery, activeCategory]);

  return (
    <div
      ref={popoverRef}
      className={`w-72 sm:w-80 rounded-2xl bg-zinc-950/95 border border-zinc-700/80 shadow-2xl backdrop-blur-2xl z-50 flex flex-col overflow-hidden text-zinc-200 animate-fade-in ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Search and Close */}
      <div className="p-2.5 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 focus-within:border-zinc-500 transition-colors">
          <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emojis..."
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-zinc-500 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category Navigation Bar */}
        {!searchQuery && (
          <div className="flex items-center justify-between gap-1 mt-2 px-0.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`p-1.5 rounded-lg transition-all text-xs flex items-center justify-center cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                  title={cat.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Emoji Grid Area */}
      <div className="p-2 overflow-y-auto max-h-56 sm:max-h-64 space-y-3">
        {/* Recents row when on 'all' tab with no search */}
        {!searchQuery && activeCategory === 'all' && recentEmojis.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-1 mb-1.5 text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wider">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>Recent & Popular</span>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {recentEmojis.slice(0, 8).map((emoji, idx) => (
                <button
                  key={`rec_${idx}_${emoji}`}
                  type="button"
                  onClick={() => handlePick(emoji)}
                  onMouseEnter={() => {
                    const match = EMOJI_DATABASE.find((e) => e.emoji === emoji);
                    setHoveredEmoji(match || { emoji, name: 'Emoji', category: 'recent', keywords: [] });
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-800 hover:scale-110 active:scale-95 text-lg font-emoji flex items-center justify-center transition-all cursor-pointer select-none leading-none"
                >
                  <span className="font-emoji select-none">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtered Emojis */}
        <div>
          {!searchQuery && (
            <div className="px-1 mb-1.5 text-[10px] font-semibold text-zinc-400 font-mono uppercase tracking-wider">
              {CATEGORIES.find((c) => c.id === activeCategory)?.label || 'Emojis'} ({filteredEmojis.length})
            </div>
          )}
          {filteredEmojis.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500">
              No matching emojis found for &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((item, idx) => (
                <button
                  key={`${item.emoji}_${idx}`}
                  type="button"
                  onClick={() => handlePick(item.emoji)}
                  onMouseEnter={() => setHoveredEmoji(item)}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-800 hover:scale-110 active:scale-95 text-lg font-emoji flex items-center justify-center transition-all cursor-pointer select-none leading-none"
                  title={item.name}
                >
                  <span className="font-emoji select-none">{item.emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Hover Preview Bar */}
      <div className="px-3 py-2 bg-zinc-900/90 border-t border-zinc-800/80 flex items-center justify-between min-h-[36px]">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-xl select-none">{hoveredEmoji.emoji}</span>
            <span className="text-xs text-zinc-300 font-medium truncate">
              {hoveredEmoji.name}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-500 font-medium">
            Click emoji to insert instantly
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 text-[11px] font-mono hover:underline ml-auto"
        >
          ESC
        </button>
      </div>
    </div>
  );
};
