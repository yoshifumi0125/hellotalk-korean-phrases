import React, { useState, useEffect, useMemo } from 'react';
import phrasesData from '../data/phrases.json';

const SpeakingComponent = () => {
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [userScript, setUserScript] = useState('');
    const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
    const [recognitionSupported, setRecognitionSupported] = useState(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    useEffect(() => {
        if (!SpeechRecognition) {
            setRecognitionSupported(false);
            return;
        }

        // シャッフルして10問セットを作る
        const shuffled = [...phrasesData.phrases].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 10));
    }, [SpeechRecognition]);

    if (!recognitionSupported) {
        return (
            <div className="quiz-container start-screen">
                <h2>🗣️ スピーキングモード</h2>
                <p>大変申し訳ありません。お使いのブラウザは音声認識機能（マイク入力）をサポートしていません。</p>
                <p>Google Chrome または 最新のSafariをご利用ください。</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return <div className="quiz-container">読み込み中...</div>;
    }

    const currentPhrase = questions[currentIndex];

    // 発音記号や空白を除外して比較しやすくする関数
    const normalizeString = (str) => {
        return str.replace(/[!?.,\s]/g, '').trim();
    };

    const playAudio = (audioPath) => {
        if (!audioPath) return;
        const audio = new Audio(audioPath);
        audio.play().catch(e => console.error("Audio play error", e));
    };

    const startRecording = () => {
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsRecording(true);
            setUserScript('');
            setFeedback(null);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setUserScript(transcript);

            // 正誤判定
            const target = normalizeString(currentPhrase.ko);
            const spoken = normalizeString(transcript);

            if (spoken === target || spoken.includes(target) || target.includes(spoken)) {
                setFeedback('correct');
            } else {
                setFeedback('wrong');
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            if (event.error === 'not-allowed') {
                alert("マイクの使用が許可されていません。ブラウザの設定でマイクへのアクセスを許可してください。");
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserScript('');
            setFeedback(null);
        } else {
            // クイズ終了したら再度シャッフルしてリスタート
            const shuffled = [...phrasesData.phrases].sort(() => 0.5 - Math.random());
            setQuestions(shuffled.slice(0, 10));
            setCurrentIndex(0);
            setUserScript('');
            setFeedback(null);
        }
    };

    return (
        <div className="quiz-container speaking-container">
            <div className="quiz-header">
                <span className="question-count">フレーズ {currentIndex + 1} / 10</span>
                <span className="mode-badge">🗣️ 発音練習</span>
            </div>

            <div className="phrase-display">
                <h2 className="speaking-korean">{currentPhrase.ko}</h2>
                <p className="speaking-kana">{currentPhrase.kana}</p>
                <p className="speaking-ja">{currentPhrase.ja}</p>
                <button
                    className="replay-btn small-margin"
                    onClick={() => playAudio(currentPhrase.audioPath)}
                >
                    🔊 お手本を聞く
                </button>
            </div>

            <div className="recording-area">
                <button
                    className={`mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={startRecording}
                    disabled={isRecording}
                >
                    {isRecording ? "🎙️ 音声を聞き取っています..." : "🎤 マイクを押して発音する"}
                </button>
            </div>

            {userScript && (
                <div className={`feedback-area ${feedback}`}>
                    <p className="user-spoken-label">あなたが発音した内容：</p>
                    <p className="user-spoken-text">{userScript}</p>

                    <div className="feedback-result">
                        {feedback === 'correct' ? (
                            <h3 className="correct-text">🎉 素晴らしい！通じます！</h3>
                        ) : (
                            <h3 className="wrong-text">惜しい！もう一度試してみましょう。</h3>
                        )}
                    </div>
                </div>
            )}

            {feedback && (
                <button className="next-btn speaking-next" onClick={handleNext}>
                    {currentIndex < questions.length - 1 ? "次のフレーズへ ➔" : "最初からやり直す ➔"}
                </button>
            )}
        </div>
    );
};

export default SpeakingComponent;
