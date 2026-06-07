import { Loader } from '@mantine/core';
import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './ask-ai-bar.scss';

const SUGGESTIONS = [
    'Show me resistant samples',
    'Show samples where pH is above 7',
    'Show samples where dissolved oxygen is below 8',
    'Show samples where water temperature is between 20 and 30',
];

export function AskAiBar({
    query,
    setQuery,
    filters,
    loading,
    error,
    onApply,
    onClear,
    totalCount,
    filteredCount,
}) {
    const [open, setOpen] = useState(false);
    const textareaRef = useRef(null);

    const isFiltered = filters && filters.length > 0;

    // Auto-grow textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [query]);

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onApply();
        }
        if (e.key === 'Escape') setOpen(false);
    }

    function handleToggle() {
        if (open && isFiltered) onClear();
        setOpen((v) => !v);
    }

    function handleSuggestion(text) {
        setQuery(text);
        setTimeout(() => textareaRef.current?.focus(), 0);
    }

    return (
        <div className={`ask-ai-bar ${open ? 'ask-ai-bar--open' : ''}`}>
            {open && (
                <div className='ask-ai-bar__suggestions'>
                    <p className='ask-ai-bar__suggestions-heading'>
                        Try asking…
                    </p>
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s}
                            className='ask-ai-bar__suggestion'
                            onClick={() => handleSuggestion(s)}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {open && (
                <div className='ask-ai-bar__input-row'>
                    <textarea
                        ref={textareaRef}
                        className='ask-ai-bar__input'
                        placeholder='Ask AI to filter the data…'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        disabled={loading}
                        rows={1}
                    />
                    <button
                        className='ask-ai-bar__send'
                        onClick={onApply}
                        disabled={loading || !query.trim()}
                        aria-label='Apply filter'
                    >
                        {loading ? (
                            <Loader size={14} color='white' />
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </div>
            )}

            {open && isFiltered && (
                <div className='ask-ai-bar__status'>
                    Showing {filteredCount} of {totalCount} samples
                </div>
            )}

            {open && error && <div className='ask-ai-bar__error'>{error}</div>}

            <button
                className='ask-ai-bar__toggle'
                onClick={handleToggle}
                aria-label='Ask AI'
            >
                {open && isFiltered ? <X size={18} /> : <Sparkles size={18} />}
                {!open && <span>Ask AI</span>}
            </button>
        </div>
    );
}
