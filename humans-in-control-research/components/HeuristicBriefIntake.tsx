/**
 * HeuristicBriefIntake — Structured form for UX analysis brief
 * Human checkpoint: user confirms all parameters before analysis begins
 */

import React, { useState, useRef } from 'react';
import { UXBrief, HeuristicDimensionId, HEURISTIC_DIMENSION_LABELS } from '../types';

interface Props {
    onSubmit: (brief: UXBrief, screenshots: { base64: string; mimeType: string; dataUri: string }[]) => void;
    isAnalyzing: boolean;
}

const EXPERIENCE_TYPES = [
    { value: 'marketing_website', label: 'Marketing Website' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'saas_dashboard', label: 'SaaS Dashboard' },
    { value: 'mobile_app', label: 'Mobile App' },
    { value: 'conversational_ai', label: 'Conversational AI' },
    { value: 'social_commerce', label: 'Social Commerce' },
] as const;

const AUDIENCE_OPTIONS = ['Consumers', 'Businesses', 'Developers', 'Internal Users', 'Students', 'Enterprise'];
const GOAL_OPTIONS = ['Acquisition', 'Conversion', 'Retention', 'Engagement', 'Education', 'Support'];

const ALL_DIMENSIONS: HeuristicDimensionId[] = [
    'traditional_usability', 'accessibility', 'visual_design', 'conversational_ai',
    'trust_architecture', 'agentic_commerce', 'social_commerce', 'geo_optimization',
];

const HeuristicBriefIntake: React.FC<Props> = ({ onSubmit, isAnalyzing }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [screenshots, setScreenshots] = useState<{ base64: string; mimeType: string; dataUri: string }[]>([]);
    const [dragActive, setDragActive] = useState(false);

    const [productName, setProductName] = useState('');
    const [productUrl, setProductUrl] = useState('');
    const [targetAudience, setTargetAudience] = useState<string[]>([]);
    const [businessGoals, setBusinessGoals] = useState<string[]>([]);
    const [competitiveContext, setCompetitiveContext] = useState('');
    const [experienceType, setExperienceType] = useState<UXBrief['experienceType']>('marketing_website');
    const [dimensions, setDimensions] = useState<HeuristicDimensionId[]>([...ALL_DIMENSIONS]);

    const handleFiles = async (files: FileList | null) => {
        if (!files) return;
        const newScreenshots: typeof screenshots = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            const dataUri = await new Promise<string>((resolve) => {
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
            const base64 = dataUri.split(',')[1];
            newScreenshots.push({ base64, mimeType: file.type, dataUri });
        }
        setScreenshots(prev => [...prev, ...newScreenshots]);
    };

    const removeScreenshot = (index: number) => {
        setScreenshots(prev => prev.filter((_, i) => i !== index));
    };

    const toggleArray = <T extends string>(arr: T[], item: T, setter: (v: T[]) => void) => {
        setter(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
    };

    const canSubmit = productName.trim() && targetAudience.length > 0 && businessGoals.length > 0 && screenshots.length >= 3 && dimensions.length > 0;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({
            productName,
            productUrl: productUrl || undefined,
            targetAudience,
            businessGoals,
            competitiveContext: competitiveContext || undefined,
            experienceType,
            evaluationDimensions: dimensions,
        }, screenshots);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Screenshot Upload */}
            <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">
                    Screenshots ({screenshots.length}/20)
                </label>
                <div
                    className={`border rounded p-6 transition-all cursor-pointer ${dragActive ? 'border-[var(--nxt-lime)] bg-[var(--nxt-lime-10)]' : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--nxt-lime)]'}`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    <div className="text-center">
                        <div className="text-[var(--text-secondary)] font-bold mb-1">Drop PNG/JPG screenshots here</div>
                        <div className="text-xs text-[var(--text-tertiary)]">Minimum 3, maximum 20 screenshots</div>
                    </div>
                </div>

                {screenshots.length > 0 && (
                    <div className="grid grid-cols-6 gap-2 mt-3">
                        {screenshots.map((s, i) => (
                            <div key={i} className="relative group aspect-video rounded overflow-hidden border border-[var(--border-primary)]">
                                <img src={s.dataUri} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute top-1 left-1 bg-[var(--nxt-teal)] text-white text-xs font-bold px-1.5 py-0.5 rounded-sm">{i + 1}</div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeScreenshot(i); }}
                                    className="absolute top-1 right-1 bg-[#FF5A5A] text-white text-xs w-5 h-5 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >x</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Product / Brand Name *</label>
                    <input
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3 text-sm focus:ring-2 focus:ring-[var(--nxt-teal)] outline-none"
                        placeholder="e.g. Acme Shopping App"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Product URL (optional)</label>
                    <input
                        value={productUrl}
                        onChange={(e) => setProductUrl(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3 text-sm focus:ring-2 focus:ring-[var(--nxt-teal)] outline-none"
                        placeholder="https://..."
                    />
                </div>
            </div>

            {/* Experience Type */}
            <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Experience Type *</label>
                <div className="grid grid-cols-3 gap-2">
                    {EXPERIENCE_TYPES.map(t => (
                        <button
                            key={t.value}
                            onClick={() => setExperienceType(t.value)}
                            className={`py-3 px-4 rounded border text-xs font-bold uppercase tracking-wide transition-all ${
                                experienceType === t.value
                                    ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]'
                                    : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-tertiary)] hover:border-[var(--nxt-lime-20)]'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Target Audience + Business Goals */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Target Audience * (select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                        {AUDIENCE_OPTIONS.map(a => (
                            <button
                                key={a}
                                onClick={() => toggleArray(targetAudience, a, setTargetAudience)}
                                className={`py-2 px-3 rounded border text-xs font-bold uppercase tracking-wide transition-all ${
                                    targetAudience.includes(a)
                                        ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]'
                                        : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-tertiary)]'
                                }`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Business Goals * (select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                        {GOAL_OPTIONS.map(g => (
                            <button
                                key={g}
                                onClick={() => toggleArray(businessGoals, g, setBusinessGoals)}
                                className={`py-2 px-3 rounded border text-xs font-bold uppercase tracking-wide transition-all ${
                                    businessGoals.includes(g)
                                        ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]'
                                        : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-tertiary)]'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Competitive Context */}
            <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Competitive Context (optional)</label>
                <input
                    value={competitiveContext}
                    onChange={(e) => setCompetitiveContext(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded p-3 text-sm focus:ring-2 focus:ring-[var(--nxt-teal)] outline-none"
                    placeholder="e.g. Competing against Amazon, Shopify..."
                />
            </div>

            {/* Evaluation Dimensions */}
            <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-tertiary)] tracking-widest mb-2">Evaluation Dimensions</label>
                <div className="grid grid-cols-2 gap-2">
                    {ALL_DIMENSIONS.map(d => (
                        <button
                            key={d}
                            onClick={() => toggleArray(dimensions, d, setDimensions)}
                            className={`py-3 px-4 rounded border text-xs font-bold tracking-wide text-left transition-all ${
                                dimensions.includes(d)
                                    ? 'bg-[var(--nxt-lime-10)] border-[var(--nxt-lime)] text-[var(--nxt-teal)]'
                                    : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-tertiary)]'
                            }`}
                        >
                            {HEURISTIC_DIMENSION_LABELS[d]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={!canSubmit || isAnalyzing}
                className={`w-full py-4 rounded text-sm font-bold uppercase tracking-widest transition-all ${
                    canSubmit && !isAnalyzing
                        ? 'bg-[var(--nxt-lime)] text-[var(--nxt-teal)] hover:brightness-110'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
                {isAnalyzing ? 'Analyzing Screenshots...' : screenshots.length < 3 ? `Upload at least ${3 - screenshots.length} more screenshots` : 'Run Heuristic Analysis'}
            </button>
        </div>
    );
};

export default HeuristicBriefIntake;
