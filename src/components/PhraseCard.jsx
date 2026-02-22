import React from 'react';

const PhraseCard = ({ phrase, onPlay }) => {
    return (
        <div className="phrase-card">
            <div className="phrase-content">
                <div className="phrase-korean">{phrase.ko}</div>
                <div className="phrase-kana">{phrase.kana}</div>
                <div className="phrase-japanese">{phrase.ja}</div>
            </div>
            <div className="phrase-actions">
                <button
                    className="btn-audio btn-slow"
                    onClick={() => onPlay(phrase, 0.6)}
                    title="ゆっくり再生"
                >
                    <span className="emoji">🐢</span>
                </button>
                <button
                    className="btn-audio btn-normal"
                    onClick={() => onPlay(phrase, 0.9)}
                    title="普通の速さで再生"
                >
                    <span className="emoji">▶️</span>
                </button>
            </div>
        </div>
    );
};

export default PhraseCard;
