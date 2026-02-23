import React, { useState, useRef, useEffect } from 'react';
import conversationsData from '../data/conversations.json';

// SVGアバター（ジウンちゃん）
const CharacterAvatar = ({ size = 48 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#fbbf24" />
        <circle cx="50" cy="50" r="45" fill="#fef3c7" />
        {/* 髪 */}
        <ellipse cx="50" cy="35" rx="35" ry="30" fill="#1e293b" />
        <rect x="15" y="30" width="70" height="20" rx="5" fill="#1e293b" />
        {/* 顔 */}
        <ellipse cx="50" cy="55" rx="28" ry="25" fill="#fde68a" />
        {/* 目 */}
        <ellipse cx="38" cy="52" rx="3.5" ry="4" fill="#1e293b" />
        <ellipse cx="62" cy="52" rx="3.5" ry="4" fill="#1e293b" />
        <circle cx="39.5" cy="51" r="1.2" fill="white" />
        <circle cx="63.5" cy="51" r="1.2" fill="white" />
        {/* 頬 */}
        <circle cx="32" cy="60" r="4" fill="#fca5a5" opacity="0.4" />
        <circle cx="68" cy="60" r="4" fill="#fca5a5" opacity="0.4" />
        {/* 口 */}
        <path d="M43 63 Q50 69 57 63" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* ヘアクリップ */}
        <rect x="70" y="28" width="8" height="4" rx="2" fill="#f472b6" />
    </svg>
);

const ChatComponent = () => {
    const [phase, setPhase] = useState('select'); // 'select' | 'chat' | 'result'
    const [scenario, setScenario] = useState(null);
    const [exchangeIndex, setExchangeIndex] = useState(0);
    const [chatLog, setChatLog] = useState([]);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showTranslation, setShowTranslation] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog]);

    const startScenario = (sc) => {
        setScenario(sc);
        setExchangeIndex(0);
        setScore(0);
        setSelectedOption(null);
        setShowTranslation(false);
        setChatLog([{
            type: 'npc',
            ko: sc.exchanges[0].npc,
            ja: sc.exchanges[0].npcJa
        }]);
        setPhase('chat');
    };

    const handleOptionSelect = (option, exchange) => {
        if (selectedOption) return; // すでに選択済み

        setSelectedOption(option);
        const isCorrect = option.correct;
        if (isCorrect) setScore(prev => prev + 1);

        // ユーザーの発言をログに追加
        setChatLog(prev => [
            ...prev,
            {
                type: 'user',
                ko: option.ko,
                ja: option.ja,
                correct: isCorrect
            }
        ]);

        // 次のターンへ or 結果表示
        setTimeout(() => {
            const nextIndex = exchangeIndex + 1;
            if (nextIndex < scenario.exchanges.length) {
                setChatLog(prev => [
                    ...prev,
                    {
                        type: 'npc',
                        ko: scenario.exchanges[nextIndex].npc,
                        ja: scenario.exchanges[nextIndex].npcJa
                    }
                ]);
                setExchangeIndex(nextIndex);
                setSelectedOption(null);
            } else {
                setPhase('result');
            }
        }, 1200);
    };

    // ======== シナリオ選択 ========
    if (phase === 'select') {
        return (
            <div className="quiz-container start-screen">
                <div className="chat-character-intro">
                    <CharacterAvatar size={80} />
                    <h2>ジウンと会話練習</h2>
                    <p className="chat-intro-text">
                        안녕하세요! 저는 지은이에요.<br />
                        <span className="chat-intro-sub">シチュエーションを選んで<br />韓国語で会話してみましょう！</span>
                    </p>
                </div>
                <div className="scenario-list">
                    {conversationsData.scenarios.map(sc => (
                        <button key={sc.id} className="scenario-btn" onClick={() => startScenario(sc)}>
                            <span className="scenario-title">{sc.title}</span>
                            <span className="scenario-desc">{sc.description}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ======== 結果画面 ========
    if (phase === 'result') {
        const total = scenario.exchanges.length;
        return (
            <div className="quiz-container result-screen">
                <CharacterAvatar size={64} />
                <h2>회화 연습 완료!</h2>
                <p className="result-subtitle">会話練習完了！</p>
                <div className="score-display">
                    <span className="score-number">{score}</span> / {total}
                </div>
                <p className="result-message">
                    {score === total ? "완벽해요! パーフェクト！🎉" : score >= total * 0.7 ? "잘했어요! よくできました！✨" : "더 연습해요! もっと練習しましょう！💪"}
                </p>
                <div className="word-quiz-modes">
                    <button className="start-btn" onClick={() => startScenario(scenario)}>同じシナリオをもう一度</button>
                    <button className="start-btn back-btn" onClick={() => setPhase('select')}>シナリオ選択に戻る</button>
                </div>
            </div>
        );
    }

    // ======== チャット画面 ========
    const currentExchange = scenario.exchanges[exchangeIndex];

    return (
        <div className="chat-container">
            {/* チャットヘッダー */}
            <div className="chat-header-bar">
                <CharacterAvatar size={32} />
                <span className="chat-partner-name">ジウン 🇰🇷</span>
                <button className="chat-translate-toggle" onClick={() => setShowTranslation(!showTranslation)}>
                    {showTranslation ? '🇰🇷 韓国語のみ' : '🇯🇵 翻訳あり'}
                </button>
            </div>

            {/* チャットログ */}
            <div className="chat-log">
                {chatLog.map((msg, i) => (
                    <div key={i} className={`chat-bubble-wrap ${msg.type}`}>
                        {msg.type === 'npc' && <CharacterAvatar size={32} />}
                        <div className={`chat-bubble ${msg.type} ${msg.correct === false ? 'incorrect' : ''} ${msg.correct === true ? 'correct-bubble' : ''}`}>
                            <p className="bubble-ko">{msg.ko}</p>
                            {showTranslation && msg.ja && (
                                <p className="bubble-ja">{msg.ja}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* 選択肢 */}
            {!selectedOption && (
                <div className="chat-options">
                    {currentExchange.options.map((opt, i) => (
                        <button key={i} className="chat-option-btn" onClick={() => handleOptionSelect(opt, currentExchange)}>
                            <span className="option-ko">{opt.ko}</span>
                            {showTranslation && <span className="option-ja">{opt.ja}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatComponent;
