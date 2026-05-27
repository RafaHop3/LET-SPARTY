import React from 'react';
import styles from './components.module.css';
import { CATEGORIES } from '../data/mockData';

interface CategoryTabsProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryTabs({ activeCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    <div className={styles.categoryTabsContainer}>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          className={`${styles.tabBtn} ${activeCategory === category ? styles.tabBtnActive : ''}`}
          onClick={() => onSelectCategory(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
