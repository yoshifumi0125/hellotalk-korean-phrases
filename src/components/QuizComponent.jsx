import React, { useState, useEffect, useMemo } from 'react';
import phrasesData from '../data/phrases.json';

const QuizComponent = () => {
    // 状態管理
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizState, setQuizState] = useState('start'); // 'start' | 'playing' | 'answered' | 'result'
    const [selectedOption, setSelectedOption] = useState(null);

    // 全フレーズ（音声ファイルパスがあるもののみ）
    const validPhrases = useMemo(() => {
        return phrasesData.phrases.filter(p => p.audioPath);
    }, []);

    // 10問のクイズを生成するロジック
    const generateQuiz = () => {
        const shuffled = [...validPhrases].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10); // 10問出題

        const newQuestions = selected.map(correctPhrase => {
            // ダミーの選択肢を3つ選ぶ
            const others = validPhrases.filter(p => p.ko !== correctPhrase.ko);
            const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
            const dummys = shuffledOthers.slice(0, 3);

            // 正解を含めて4択を作り、シャッフル
            const options = [correctPhrase, ...dummys].sort(() => 0.5 - Math.random());

            return {
                correct: correctPhrase,
                options: options
            };
        });

        setQuestions(newQuestions);
        setCurrentIndex(0);
        setScore(0);
        setSelectedOption(null);
        setQuizState('playing');

        // 最初の音声を再生
        playAudio(newQuestions[0].correct.audioPath);
    };

    const playAudio = (audioPath) => {
        if (!audioPath) return;
        const audio = new Audio(audioPath);
        audio.play().catch(e => console.error("Audio play error", e));
    };

    const handleOptionClick = (option) => {
        if (quizState === 'answered') return;

        setSelectedOption(option);
        setQuizState('answered');

        const isCorrect = option.ko === questions[currentIndex].correct.ko;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setQuizState('playing');
            playAudio(questions[currentIndex + 1].correct.audioPath);
        } else {
            setQuizState('result');
        }
    };

    if (quizState === 'start') {
        return (
            <div className="quiz-container start-screen">
                <h2>🎧 リスニングクイズ</h2>
                <p>ランダムに流れる韓国語の音声を聞いて、正しい日本語訳を4択から選んでください。</p>
                <p className="quiz-info">全10問</p>
                <button className="start-btn" onClick={generateQuiz}>クイズをスタート！</button>
            </div>
        );
    }

    if (quizState === 'result') {
        return (
            <div className="quiz-container result-screen">
                <h2>クイズ結果</h2>
                <div className="score-display">
                    <span className="score-number">{score}</span> / 10
                </div>
                <p className="result-message">
                    {score === 10 ? "完璧です！🎉" : score >= 8 ? "素晴らしい成績です！✨" : score >= 5 ? "よく頑張りました！👍" : "もっと練習しましょう！💪"}
                </p>
                <button className="start-btn" onClick={generateQuiz}>もう一度挑戦する</button>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <span className="question-count">問題 {currentIndex + 1} / 10</span>
                <span className="current-score">スコア: {score}</span>
            </div>

            <div className="audio-player-area">
                <button
                    className="replay-btn"
                    onClick={() => playAudio(currentQuestion.correct.audioPath)}
                >
                    🔊 音声をもう一度聞く
                </button>
            </div>

            <div className="options-grid">
                {currentQuestion.options.map((option, idx) => {
                    let className = "option-btn";
                    if (quizState === 'answered') {
                        if (option.ko === currentQuestion.correct.ko) {
                            className += " correct";
                        } else if (option.ko === selectedOption?.ko) {
                            className += " wrong";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            className={className}
                            onClick={() => handleOptionClick(option)}
                            disabled={quizState === 'answered'}
                        >
                            {option.ja}
                        </button>
                    );
                })}
            </div>

            {quizState === 'answered' && (
                <div className="answer-feedback">
                    <div className="feedback-content">
                        <p className="korean-reveal">{currentQuestion.correct.ko}</p>
                        <p className="kana-reveal">{currentQuestion.correct.kana}</p>
                    </div>
                    <button className="next-btn" onClick={handleNext}>
                        {currentIndex < questions.length - 1 ? "次の問題へ ➔" : "結果を見る ➔"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizComponent;
