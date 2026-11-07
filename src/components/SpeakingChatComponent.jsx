import React, { useState, useRef, useEffect, useCallback } from 'react';
import conversationsData from '../data/conversations.json';

// キャラクター画像パス
const CHARACTER_IMAGES = {
    default: '/characters/jieun_default.png',
    happy: '/characters/jieun_happy.png',
    thinking: '/characters/jieun_thinking.png',
    encouraging: '/characters/jieun_encouraging.png',
};

// Gemini API設定
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// シナリオ別のシステムプロンプト
const SCENARIO_PROMPTS = {
    cafe: `あなたは韓国のカフェの店員「ジウン（지은）」です。お客さんが韓国語で注文しようとしています。カフェの店員として自然に対応してください。`,
    introduce: `あなたは韓国人の友達「ジウン（지은）」です。新しい友達と会って自己紹介しています。フレンドリーに会話してください。`,
    shopping: `あなたは韓国の洋服屋の店員「ジウン（지은）」です。お客さんが買い物をしています。親切に接客してください。`,
    direction: `あなたは韓国の通りすがりの人「ジウン（지은）」です。外国人が道を聞いています。親切に教えてあげてください。`,
    restaurant: `あなたは韓国の食堂の店員「ジウン（지은）」です。お客さんが食事を注文しようとしています。自然に接客してください。`,
    freetalk: `あなたは韓国人の友達「ジウン（지은）」です。日本人の友達と自由に韓国語で会話しています。楽しくフレンドリーに会話してください。相手の韓国語レベルは初級〜中級です。`,
};

const SYSTEM_PROMPT_BASE = `あなたは韓国人の女性「ジウン（지은）」、20代のフレンドリーな韓国語の先生です。

【重要なルール】
1. 必ず韓国語で返答してください
2. 返答の後に必ず「---」で区切って日本語訳を付けてください
3. 相手が文法的に間違えていたら、優しく正しい表現を教えてください
4. 返答は短めに（1-3文）、会話を続けやすい質問を含めてください
5. 絵文字は使わないでください
6. 返答フォーマット:
韓国語の返答
---
日本語訳

【例】
네, 아메리카노 한 잔이요! 사이즈는 어떤 걸로 할까요?
---
はい、アメリカーノ1杯ですね！サイズはどれにしますか？`;

const SpeakingChatComponent = () => {
    const [phase, setPhase] = useState('select'); // 'select' | 'chat' | 'result'
    const [chatMode, setChatMode] = useState('scenario'); // 'scenario' | 'freetalk'
    const [scenario, setScenario] = useState(null);
    const [exchangeIndex, setExchangeIndex] = useState(0);
    const [chatLog, setChatLog] = useState([]);
    const [score, setScore] = useState(0);
    const [characterExpression, setCharacterExpression] = useState('default');
    const [isRecording, setIsRecording] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showTranslation, setShowTranslation] = useState(true);
    const [showHint, setShowHint] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [recognitionSupported, setRecognitionSupported] = useState(true);
    const [turnCount, setTurnCount] = useState(0);
    const [apiError, setApiError] = useState('');

    // API Key管理
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [apiKeyTemp, setApiKeyTemp] = useState('');

    const chatEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const feedbackTimerRef = useRef(null);
    const conversationHistoryRef = useRef([]);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        if (!SpeechRecognition) setRecognitionSupported(false);
        return () => {
            stopListening();
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, [SpeechRecognition]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog, feedback, isThinking]);

    // 文字列正規化
    const normalizeString = (str) => str.replace(/[!?.,\s]/g, '').trim();

    // 類似度計算
    const getSimilarity = (a, b) => {
        if (a === b) return 1;
        if (!a.length || !b.length) return 0;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b[i - 1] === a[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return 1 - matrix[b.length][a.length] / Math.max(a.length, b.length);
    };

    // TTS
    const speakKorean = useCallback((text, callback) => {
        if (!text || !('speechSynthesis' in window)) { callback?.(); return; }
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[!?]/g, '').trim();
        const uttr = new SpeechSynthesisUtterance(cleanText);
        uttr.lang = 'ko-KR';
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(v =>
            v.lang.startsWith('ko') || v.name.toLowerCase().includes('korean') || v.name.toLowerCase().includes('yuna')
        );
        if (koreanVoice) uttr.voice = koreanVoice;
        uttr.rate = 0.9;
        uttr.onend = () => callback?.();
        uttr.onerror = () => callback?.();
        window.speechSynthesis.speak(uttr);
    }, []);

    // 音声認識停止
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) { }
            recognitionRef.current = null;
        }
        setIsRecording(false);
        setInterimText('');
    }, []);

    // Gemini APIでジウンの応答を生成
    const generateResponse = useCallback(async (userMessage, scenarioId) => {
        if (!apiKey) {
            setApiError('APIキーが未設定です');
            return null;
        }
        setApiError('');

        const scenarioPrompt = SCENARIO_PROMPTS[scenarioId] || SCENARIO_PROMPTS.freetalk;
        const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n【今のシチュエーション】\n${scenarioPrompt}`;

        const contents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n以下の会話の続きとして返答してください。` }] },
            { role: 'model', parts: [{ text: '네, 알겠습니다! 지은으로서 대화하겠습니다.\n---\nはい、わかりました！ジウンとして会話しますね。' }] },
            ...conversationHistoryRef.current,
            { role: 'user', parts: [{ text: userMessage }] }
        ];

        try {
            console.log('[Gemini API] Sending request...');
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents,
                    generationConfig: { temperature: 0.8, maxOutputTokens: 200, topP: 0.9 }
                })
            });

            console.log('[Gemini API] Status:', response.status);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('[Gemini API] Error:', response.status, errorBody);
                setApiError(`API Error ${response.status}: ${errorBody.substring(0, 100)}`);
                return null;
            }

            const data = await response.json();
            console.log('[Gemini API] Response:', JSON.stringify(data).substring(0, 200));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                setApiError('');
                conversationHistoryRef.current.push(
                    { role: 'user', parts: [{ text: userMessage }] },
                    { role: 'model', parts: [{ text }] }
                );
                if (conversationHistoryRef.current.length > 20) {
                    conversationHistoryRef.current = conversationHistoryRef.current.slice(-16);
                }
            } else {
                setApiError('APIから空の応答が返されました');
            }
            return text;
        } catch (error) {
            console.error('[Gemini API] Fetch error:', error);
            setApiError(`通信エラー: ${error.message}`);
            return null;
        }
    }, [apiKey]);

    // 応答テキストをパース
    const parseResponse = (text) => {
        if (!text) return { ko: '죄송해요, 다시 말해주세요.', ja: 'すみません、もう一度言ってください。' };
        const parts = text.split('---');
        return parts.length >= 2
            ? { ko: parts[0].trim(), ja: parts[1].trim() }
            : { ko: text.trim(), ja: '' };
    };

    // 音声でマッチする選択肢を探す
    const findBestMatch = useCallback((spokenText, options) => {
        const spoken = normalizeString(spokenText);
        let bestMatch = null;
        let bestSimilarity = 0;
        options.forEach(opt => {
            const similarity = getSimilarity(spoken, normalizeString(opt.ko));
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = opt;
            }
        });
        return { match: bestMatch, similarity: bestSimilarity };
    }, []);

    // ==================================================
    // シナリオモード: 元のexchangeデータを使う会話処理
    // ==================================================
    const handleScenarioSpeech = useCallback(async (spokenText) => {
        stopListening();
        setInterimText('');

        const currentExchange = scenario.exchanges[exchangeIndex];

        // APIキーがあれば動的応答を試みる
        if (apiKey) {
            // ユーザー発話をログに追加
            setChatLog(prev => [...prev, { type: 'user', ko: spokenText, ja: '' }]);
            setTurnCount(prev => prev + 1);
            setIsThinking(true);
            setCharacterExpression('thinking');

            const responseText = await generateResponse(spokenText, scenario.id);
            setIsThinking(false);

            if (responseText) {
                const { ko, ja } = parseResponse(responseText);
                setChatLog(prev => [...prev, { type: 'npc', ko, ja }]);
                setCharacterExpression('happy');
                setScore(prev => prev + 1);
                speakKorean(ko, () => setCharacterExpression('default'));

                // 次のexchangeへ進む（シナリオの流れを保持）
                feedbackTimerRef.current = setTimeout(() => {
                    const nextIndex = exchangeIndex + 1;
                    if (nextIndex < scenario.exchanges.length) {
                        setExchangeIndex(nextIndex);
                        setShowHint(false);
                    } else {
                        setPhase('result');
                    }
                }, 3000);
                return;
            }
            // API失敗時はフォールバックへ
        }

        // フォールバック: 選択肢マッチングで判定
        const { match, similarity } = findBestMatch(spokenText, currentExchange.options);

        if (match && similarity >= 0.5) {
            const isCorrect = match.correct;
            if (isCorrect) setScore(prev => prev + 1);

            setFeedback(isCorrect ? 'correct' : 'wrong');
            setCharacterExpression(isCorrect ? 'happy' : 'encouraging');

            setChatLog(prev => [...prev, {
                type: 'user', ko: match.ko, ja: match.ja,
                spoken: spokenText !== match.ko ? spokenText : undefined,
                correct: isCorrect
            }]);

            setTurnCount(prev => prev + 1);

            feedbackTimerRef.current = setTimeout(() => {
                setFeedback(null);
                const nextIndex = exchangeIndex + 1;
                if (nextIndex < scenario.exchanges.length) {
                    setExchangeIndex(nextIndex);
                    setShowHint(false);
                    const nextExchange = scenario.exchanges[nextIndex];
                    setChatLog(prev => [...prev, { type: 'npc', ko: nextExchange.npc, ja: nextExchange.npcJa }]);
                    setCharacterExpression('default');
                    speakKorean(nextExchange.npc);
                } else {
                    setPhase('result');
                }
            }, 2000);
        } else {
            // マッチしない → リトライ
            setFeedback('retry');
            setCharacterExpression('encouraging');
            feedbackTimerRef.current = setTimeout(() => {
                setFeedback(null);
                setInterimText('');
                setCharacterExpression('default');
            }, 2000);
        }
    }, [stopListening, scenario, exchangeIndex, apiKey, generateResponse, findBestMatch, speakKorean]);

    // ==================================================
    // フリートークモード: Gemini APIで完全動的会話
    // ==================================================
    const handleFreeTalkSpeech = useCallback(async (spokenText) => {
        stopListening();
        setInterimText('');

        setChatLog(prev => [...prev, { type: 'user', ko: spokenText, ja: '' }]);
        setTurnCount(prev => prev + 1);
        setIsThinking(true);
        setCharacterExpression('thinking');

        const responseText = await generateResponse(spokenText, 'freetalk');
        setIsThinking(false);

        if (responseText) {
            const { ko, ja } = parseResponse(responseText);
            setChatLog(prev => [...prev, { type: 'npc', ko, ja }]);
            setCharacterExpression('happy');
            speakKorean(ko, () => setCharacterExpression('default'));
        } else {
            // API未設定またはエラー
            const fallbacks = [
                { ko: '네, 그렇군요! 다른 이야기도 해 봐요.', ja: 'そうなんですね！他の話もしてみましょう。' },
                { ko: '아, 정말요? 더 자세히 말해 주세요!', ja: 'あ、本当ですか？もっと詳しく教えてください！' },
                { ko: '재미있네요! 그래서 어떻게 됐어요?', ja: '面白いですね！それでどうなりましたか？' },
                { ko: '좋아요! 저도 그렇게 생각해요.', ja: 'いいですね！私もそう思います。' },
                { ko: '와, 대단해요! 한국어 잘하시네요!', ja: 'わあ、すごいですね！韓国語お上手ですね！' },
            ];
            const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            setChatLog(prev => [...prev, { type: 'npc', ...fb }]);
            setCharacterExpression('happy');
            speakKorean(fb.ko, () => setCharacterExpression('default'));
        }
    }, [stopListening, generateResponse, speakKorean]);

    // 音声認識開始
    const startListening = useCallback(() => {
        if (!SpeechRecognition) return;
        stopListening();

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => { setIsRecording(true); setInterimText(''); };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interim = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            setInterimText(finalTranscript || interim);

            if (finalTranscript) {
                try { recognition.stop(); } catch (e) { }
                if (chatMode === 'freetalk') {
                    handleFreeTalkSpeech(finalTranscript);
                } else {
                    handleScenarioSpeech(finalTranscript);
                }
            }
        };

        recognition.onerror = (event) => {
            setIsRecording(false);
            setInterimText('');
            if (event.error === 'not-allowed') {
                alert("マイクの使用が許可されていません。");
            }
        };

        recognition.onend = () => setIsRecording(false);
        try { recognition.start(); } catch (e) { }
    }, [SpeechRecognition, stopListening, chatMode, handleScenarioSpeech, handleFreeTalkSpeech]);

    // タップで選択肢を選んだ場合
    const handleOptionTap = (option) => {
        if (feedback) return;
        stopListening();

        const isCorrect = option.correct;
        if (isCorrect) setScore(prev => prev + 1);

        setFeedback(isCorrect ? 'correct' : 'wrong');
        setCharacterExpression(isCorrect ? 'happy' : 'encouraging');

        setChatLog(prev => [...prev, {
            type: 'user', ko: option.ko, ja: option.ja, correct: isCorrect
        }]);

        setTurnCount(prev => prev + 1);

        feedbackTimerRef.current = setTimeout(() => {
            setFeedback(null);
            const nextIndex = exchangeIndex + 1;
            if (nextIndex < scenario.exchanges.length) {
                setExchangeIndex(nextIndex);
                setShowHint(false);
                const nextExchange = scenario.exchanges[nextIndex];
                setChatLog(prev => [...prev, { type: 'npc', ko: nextExchange.npc, ja: nextExchange.npcJa }]);
                setCharacterExpression('default');
                speakKorean(nextExchange.npc);
            } else {
                setPhase('result');
            }
        }, 2000);
    };

    // API Key保存
    const saveApiKey = () => {
        localStorage.setItem('gemini_api_key', apiKeyTemp);
        setApiKey(apiKeyTemp);
        setShowApiKeyInput(false);
    };

    // シナリオ開始
    const startScenario = (sc) => {
        setScenario(sc);
        setChatMode('scenario');
        setExchangeIndex(0);
        setScore(0);
        setTurnCount(0);
        setFeedback(null);
        setShowHint(false);
        setCharacterExpression('default');
        setInterimText('');
        conversationHistoryRef.current = [];

        setChatLog([{ type: 'npc', ko: sc.exchanges[0].npc, ja: sc.exchanges[0].npcJa }]);
        setPhase('chat');
        setTimeout(() => speakKorean(sc.exchanges[0].npc), 500);
    };

    // フリートーク開始
    const startFreeTalk = () => {
        setScenario({ id: 'freetalk', title: '🗣️ フリートーク', exchanges: [] });
        setChatMode('freetalk');
        setExchangeIndex(0);
        setScore(0);
        setTurnCount(0);
        setFeedback(null);
        setShowHint(false);
        setCharacterExpression('default');
        setInterimText('');
        conversationHistoryRef.current = [];

        const msg = '안녕하세요! 오늘은 무슨 이야기를 할까요? 뭐든지 좋아요!';
        const ja = 'こんにちは！今日は何の話をしましょうか？何でもいいですよ！';
        setChatLog([{ type: 'npc', ko: msg, ja }]);
        setPhase('chat');
        setTimeout(() => speakKorean(msg), 500);
    };

    // ======== シナリオ選択画面 ========
    if (phase === 'select') {
        return (
            <div className="speaking-chat-select">
                <div className="sc-character-intro">
                    <div className="sc-character-img-wrap">
                        <img src={CHARACTER_IMAGES.default} alt="ジウン" className="sc-character-img" />
                    </div>
                    <h2 className="sc-intro-title">ジウンと会話しよう！</h2>
                    <p className="sc-intro-desc">
                        안녕하세요! 저는 지은이에요.<br />
                        <span className="sc-intro-sub">声で韓国語を話して会話を進めよう！</span>
                    </p>
                </div>

                {/* API Key設定 */}
                {!apiKey && !showApiKeyInput && (
                    <div className="sc-api-key-notice">
                        <p>💡 フリートークにはGemini APIキーが必要です</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            シナリオ会話はAPIキーなしでも使えます
                        </p>
                        <button className="sc-api-key-btn" onClick={() => { setShowApiKeyInput(true); setApiKeyTemp(''); }}>
                            APIキーを設定する
                        </button>
                    </div>
                )}

                {apiKey && !showApiKeyInput && (
                    <div className="sc-api-key-status">
                        <span>✅ APIキー設定済み</span>
                        <button className="sc-api-key-change" onClick={() => { setShowApiKeyInput(true); setApiKeyTemp(apiKey); }}>変更</button>
                    </div>
                )}

                {showApiKeyInput && (
                    <div className="sc-api-key-form">
                        <input type="password" placeholder="Gemini APIキーを入力" value={apiKeyTemp}
                            onChange={e => setApiKeyTemp(e.target.value)} className="sc-api-key-input" />
                        <div className="sc-api-key-actions">
                            <button className="sc-btn primary small" onClick={saveApiKey} disabled={!apiKeyTemp}>保存</button>
                            <button className="sc-btn secondary small" onClick={() => setShowApiKeyInput(false)}>キャンセル</button>
                        </div>
                        <p className="sc-api-key-help">
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                                Google AI Studioで無料取得 →
                            </a>
                        </p>
                    </div>
                )}

                {!recognitionSupported && (
                    <div className="sc-warning">⚠️ お使いのブラウザは音声認識をサポートしていません。<br />Google Chromeをご利用ください。</div>
                )}

                {/* フリートーク */}
                {apiKey && (
                    <button className="sc-freetalk-btn" onClick={startFreeTalk}>
                        <span className="sc-freetalk-icon">🗣️</span>
                        <div className="sc-freetalk-text">
                            <span className="sc-freetalk-title">フリートーク</span>
                            <span className="sc-freetalk-desc">AIが応答！自由に韓国語で会話しよう</span>
                        </div>
                    </button>
                )}

                <div className="sc-scenario-list">
                    <p className="sc-scenario-list-label">シチュエーション別</p>
                    {conversationsData.scenarios.map(sc => (
                        <button key={sc.id} className="sc-scenario-btn" onClick={() => startScenario(sc)}>
                            <span className="sc-scenario-title">{sc.title}</span>
                            <span className="sc-scenario-desc">
                                {sc.description}
                                {apiKey && <span style={{ color: 'var(--duo-purple)', marginLeft: '0.3rem', fontSize: '0.7rem' }}>+ AI応答</span>}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ======== 結果画面 ========
    if (phase === 'result') {
        const total = chatMode === 'scenario' ? scenario.exchanges.length : turnCount;
        const isPerfect = chatMode === 'scenario' && score === total;

        return (
            <div className="speaking-chat-result">
                <div className="sc-result-character">
                    <img src={isPerfect ? CHARACTER_IMAGES.happy : CHARACTER_IMAGES.encouraging} alt="ジウン" className="sc-character-img result" />
                </div>
                <h2 className="sc-result-title">
                    {isPerfect ? '완벽해요!' : score >= total * 0.7 ? '잘했어요!' : '수고했어요!'}
                </h2>
                <p className="sc-result-subtitle">
                    {isPerfect ? 'パーフェクト！' : score >= total * 0.7 ? 'よくできました！' : 'お疲れさまでした！'}
                </p>
                {chatMode === 'scenario' ? (
                    <div className="sc-result-score">
                        <span className="sc-score-number">{score}</span>
                        <span className="sc-score-total">/ {total} 正解</span>
                    </div>
                ) : (
                    <div className="sc-result-score">
                        <span className="sc-score-number">{turnCount}</span>
                        <span className="sc-score-total">ターン会話しました</span>
                    </div>
                )}
                <div className="sc-result-actions">
                    <button className="sc-btn primary" onClick={() => {
                        if (chatMode === 'freetalk') startFreeTalk();
                        else startScenario(scenario);
                    }}>もう一度会話する</button>
                    <button className="sc-btn secondary" onClick={() => { setPhase('select'); setCharacterExpression('default'); }}>
                        シナリオ選択に戻る
                    </button>
                </div>
            </div>
        );
    }

    // ======== チャット画面 ========
    const currentExchange = chatMode === 'scenario' && scenario.exchanges[exchangeIndex];

    return (
        <div className="speaking-chat-container">
            {/* キャラクター */}
            <div className="sc-character-area">
                <img src={CHARACTER_IMAGES[characterExpression]} alt="ジウン"
                    className={`sc-chat-character ${characterExpression}`} key={characterExpression} />
                {feedback === 'correct' && <div className="sc-expression-badge correct">정답! 🎉</div>}
                {feedback === 'wrong' && <div className="sc-expression-badge wrong">다시 해봐요! 💪</div>}
                {feedback === 'retry' && <div className="sc-expression-badge retry">다시 말해봐요! 🗣️</div>}
                {isThinking && <div className="sc-expression-badge thinking">생각 중...</div>}
            </div>

            {/* コントロールバー */}
            <div className="sc-controls-bar">
                <span className="sc-progress-label">
                    {chatMode === 'scenario'
                        ? `${exchangeIndex + 1} / ${scenario.exchanges.length}`
                        : `${scenario?.title} · ${turnCount}ターン`}
                </span>
                <button className="sc-translate-toggle" onClick={() => setShowTranslation(!showTranslation)}>
                    {showTranslation ? '🇰🇷 韓国語のみ' : '🇯🇵 翻訳あり'}
                </button>
            </div>

            {/* チャットログ */}
            <div className="sc-chat-log">
                {chatLog.map((msg, i) => (
                    <div key={i} className={`sc-bubble-wrap ${msg.type}`}>
                        {msg.type === 'npc' && <img src={CHARACTER_IMAGES.default} alt="" className="sc-bubble-avatar" />}
                        <div className={`sc-bubble ${msg.type} ${msg.correct === false ? 'incorrect' : ''} ${msg.correct === true ? 'correct-bubble' : ''}`}>
                            <p className="sc-bubble-ko">{msg.ko}</p>
                            {showTranslation && msg.ja && <p className="sc-bubble-ja">{msg.ja}</p>}
                            {msg.spoken && <p className="sc-bubble-spoken">🎙️ {msg.spoken}</p>}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="sc-bubble-wrap npc">
                        <img src={CHARACTER_IMAGES.thinking} alt="" className="sc-bubble-avatar" />
                        <div className="sc-bubble npc">
                            <div className="sc-typing-indicator"><span></span><span></span><span></span></div>
                        </div>
                    </div>
                )}
                {apiError && (
                    <div className="sc-bubble-wrap npc">
                        <div className="sc-bubble npc" style={{ background: 'rgba(255,75,75,0.15)', border: '1px solid rgba(255,75,75,0.3)' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--duo-red)' }}>⚠️ {apiError}</p>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* 入力エリア */}
            <div className="sc-input-area">
                {!feedback && (
                    <div className="sc-mic-section">
                        <button className={`sc-mic-btn ${isRecording ? 'recording' : ''}`}
                            onClick={() => { if (isRecording) stopListening(); else startListening(); }}
                            disabled={!recognitionSupported || isThinking}>
                            <span className={`sc-mic-icon ${isRecording ? 'recording' : ''}`}>
                                {isRecording ? '🎙️' : '🎤'}
                            </span>
                        </button>
                        <p className="sc-mic-label">
                            {isThinking ? 'ジウンが考え中...' : isRecording ? '聞き取り中...' : 'タップして話す'}
                        </p>
                    </div>
                )}

                {interimText && (
                    <div className="sc-interim"><p>{interimText}</p></div>
                )}

                {/* シナリオモード: ヒント/選択肢 */}
                {chatMode === 'scenario' && currentExchange && (
                    <div className="sc-hint-section">
                        {!showHint && !feedback && (
                            <button className="sc-hint-toggle" onClick={() => setShowHint(true)}>
                                💡 ヒントを見る
                            </button>
                        )}
                        {(showHint || feedback) && (
                            <div className="sc-options">
                                <p className="sc-options-label">選択肢（タップでも回答可）：</p>
                                {currentExchange.options.map((opt, i) => (
                                    <button key={i} className={`sc-option-btn ${feedback ? 'disabled' : ''}`}
                                        onClick={() => !feedback && handleOptionTap(opt)} disabled={!!feedback}>
                                        <span className="sc-option-ko">{opt.ko}</span>
                                        {showTranslation && <span className="sc-option-ja">{opt.ja}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* フリートーク: 終了ボタン */}
                {chatMode === 'freetalk' && (
                    <button className="sc-end-chat-btn" onClick={() => { stopListening(); setPhase('result'); }}>
                        会話を終了する
                    </button>
                )}
            </div>
        </div>
    );
};

export default SpeakingChatComponent;
