import React from 'react';
import PhraseCard from './PhraseCard';

const CategorySection = ({ title, phrases, onPlay }) => {
    // Generate a safe id from the title (e.g., "基本の挨拶" -> "基本の挨拶")
    const sectionId = title.replace(/\s+/g, '-');
    return (
        <section id={sectionId} className="category-section">
            <h2 className="category-title">{title}</h2>
            <div className="phrases-grid">
                {phrases.map(phrase => (
                    <PhraseCard key={phrase.id || phrase.ko} phrase={phrase} onPlay={onPlay} />
                ))}
            </div>
        </section>
    );
};

export default CategorySection;
