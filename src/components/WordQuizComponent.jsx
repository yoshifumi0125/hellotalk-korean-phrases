import React, { useState, useMemo } from 'react';
import levelsData from '../data/levels.json';

const WordQuizComponent = () => {
    const [quizState, setQuizState] = useState('start'); // 'start' | 'playing' | 'answered' | 'result'
    const [quizMode, setQuizMode] = useState('ko_to_ja'); // 'ko_to_ja' | 'ja_to_ko'
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);

    const words = levelsData.wordQuiz;

    const generateQuiz = (mode) => {
        setQuizMode(mode);
        const shuffled = [...words].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 10);

        const newQuestions = selected.map(correctWord => {
            const others = words.filter(w => w.ko !== correctWord.ko);
            const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
            const dummys = shuffledOthers.slice(0, 3);
            const options = [correctWord, ...dummys].sort(() => 0.5 - Math.random());
            return { correct: correctWord, options };
        });

        setQuestions(newQuestions);
        setCurrentIndex(0);
        setScore(0);
        setSelectedOption(null);
        setQuizState('playing');
    };

    const handleOptionClick = (option) => {
        if (quizState === 'answered') return;
        setSelectedOption(option);
        setQuizState('answered');
        if (option.ko === questions[currentIndex].correct.ko) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setQuizState('playing');
        } else {
            setQuizState('result');
        }
    };

    // ======== スタート画面 ========
    if (quizState === 'start') {
        return (
            <div className="quiz-container start-screen">
                <h2>📝 ハングル単語クイズ</h2>
                <p>韓国語の基本単語40語からランダムに10問出題されます。</p>
                <p>モードを選んでスタート！</p>
                <div className="word-quiz-modes">
                    <button className="start-btn" onClick={() => generateQuiz('ko_to_ja')}>
                        🇰🇷→🇯🇵 韓国語→日本語
                    </button>
                    <button className="start-btn reverse-btn" onClick={() => generateQuiz('ja_to_ko')}>
                        🇯🇵→🇰🇷 日本語→韓国語
                    </button>
                </div>
            </div>
        );
    }

    // ======== 結果画面 ========
    if (quizState === 'result') {
        return (
            <div className="quiz-container result-screen">
                <h2>単語クイズ 結果</h2>
                <div className="score-display">
                    <span className="score-number">{score}</span> / 10
                </div>
                <p className="result-message">
                    {score === 10 ? "全問正解！完璧です！🎉" : score >= 8 ? "素晴らしい！✨" : score >= 5 ? "いい調子です！👍" : "もっと練習しましょう！💪"}
                </p>
                <div className="word-quiz-modes">
                    <button className="start-btn" onClick={() => generateQuiz(quizMode)}>同じモードでもう一度</button>
                    <button className="start-btn reverse-btn" onClick={() => setQuizState('start')}>モード選択に戻る</button>
                </div>
            </div>
        );
    }

    // ======== プレイ画面 ========
    const currentQuestion = questions[currentIndex];
    const questionText = quizMode === 'ko_to_ja' ? currentQuestion.correct.ko : currentQuestion.correct.ja;

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <span className="question-count">問題 {currentIndex + 1} / 10</span>
                <span className="current-score">正解: {score}</span>
            </div>

            {/* プログレスバー */}
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${((currentIndex) / questions.length) * 100}%` }}></div>
            </div>

            <div className="word-question-area">
                <p className="word-question-label">
                    {quizMode === 'ko_to_ja' ? 'この韓国語の意味は？' : 'この日本語を韓国語で？'}
                </p>
                <h2 className="word-question-text">{questionText}</h2>
            </div>

            <div className="options-grid">
                {currentQuestion.options.map((option, idx) => {
                    const displayText = quizMode === 'ko_to_ja' ? option.ja : option.ko;
                    let className = "option-btn";
                    if (quizState === 'answered') {
                        if (option.ko === currentQuestion.correct.ko) {
                            className += " correct";
                        } else if (option.ko === selectedOption?.ko) {
                            className += " wrong";
                        }
                    }
                    return (
                        <button key={idx} className={className} onClick={() => handleOptionClick(option)} disabled={quizState === 'answered'}>
                            {displayText}
                        </button>
                    );
                })}
            </div>

            {quizState === 'answered' && (
                <div className="answer-feedback">
                    <div className="feedback-content">
                        <p className="korean-reveal">{currentQuestion.correct.ko}</p>
                        <p className="kana-reveal">{currentQuestion.correct.kana} = {currentQuestion.correct.ja}</p>
                    </div>
                    <button className="next-btn" onClick={handleNext}>
                        {currentIndex < questions.length - 1 ? "次へ ➔" : "結果を見る ➔"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WordQuizComponent;
