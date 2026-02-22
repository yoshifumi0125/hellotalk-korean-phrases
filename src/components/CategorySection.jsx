import React from 'react';
import PhraseCard from './PhraseCard';

const CategorySection = ({ title, phrases, onPlay }) => {
    return (
        <section className="category-section">
            <h2 className="category-title">{title}</h2>
            <div className="phrases-grid">
                {phrases.map(phrase => (
                    <PhraseCard key={phrase.id} phrase={phrase} onPlay={onPlay} />
                ))}
            </div>
        </section>
    );
};

export default CategorySection;
