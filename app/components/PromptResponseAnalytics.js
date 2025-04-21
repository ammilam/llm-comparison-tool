"use client";

import { useState, useEffect } from "react";
import { Chart, registerables } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { analyzeSentiment } from "../lib/sentiment";

// Register ChartJS components
if (typeof window !== 'undefined') {
    Chart.register(...registerables);
}

export default function PromptResponseAnalytics({ responses }) {
    const [metrics, setMetrics] = useState(null);
    const [activeTab, setActiveTab] = useState('length');
    const [isUsingSentimentAPI, setIsUsingSentimentAPI] = useState(false);
    const [sentimentProcessing, setSentimentProcessing] = useState(false);

    useEffect(() => {
        if (responses && responses.length > 0) {
            calculateMetrics(responses);
        }
    }, [responses]);

    const calculateMetrics = async (responses) => {
        // Basic metrics
        const modelResponseLengths = {};
        const totalWordsByModel = {};
        const avgWordLengthByModel = {};
        const sentimentScores = {};
        const sentimentMagnitudes = {};
        const complexityScores = {};
        const responseSpeedByModel = {};
        const promptTokensByModel = {};
        const completionTokensByModel = {};
        const totalTokensByModel = {};

        // Tokenizing helper
        const countWords = (text) => {
            return text.trim().split(/\s+/).length;
        };

        // Calculate average word length (a simple proxy for complexity)
        const calculateAvgWordLength = (text) => {
            const words = text.trim().split(/\s+/);
            const totalLength = words.reduce((sum, word) => sum + word.length, 0);
            return words.length > 0 ? totalLength / words.length : 0;
        };

        // Process each response for basic metrics first
        responses.forEach(response => {
            if (!response || response.error) return;

            const model = response.model;
            const text = response.text;
            const wordCount = countWords(text);
            const charCount = text.length;
            const avgWordLength = calculateAvgWordLength(text);

            // Initialize if first time seeing this model
            if (!responseSpeedByModel[model]) {
                responseSpeedByModel[model] = [];
            }

            // Add response time if available
            if (response.responseTime) {
                responseSpeedByModel[model].push(response.responseTime);
            }

            // Initialize if first time seeing this model for tokens
            if (!promptTokensByModel[model]) {
                promptTokensByModel[model] = 0;
                completionTokensByModel[model] = 0;
                totalTokensByModel[model] = 0;
            }

            // Add token metrics if available
            if (response.promptTokens) {
                promptTokensByModel[model] += response.promptTokens;
            }

            if (response.completionTokens) {
                completionTokensByModel[model] += response.completionTokens;
            }

            // Calculate total tokens
            if (response.promptTokens && response.completionTokens) {
                totalTokensByModel[model] += (response.promptTokens + response.completionTokens);
            } else if (response.totalTokens) {
                totalTokensByModel[model] += response.totalTokens;
            }

            // Initialize if first time seeing this model
            if (!modelResponseLengths[model]) {
                modelResponseLengths[model] = [];
                totalWordsByModel[model] = 0;
                avgWordLengthByModel[model] = [];
                sentimentScores[model] = [];
                sentimentMagnitudes[model] = [];
                complexityScores[model] = [];
            }

            // Add metrics
            modelResponseLengths[model].push(charCount);
            totalWordsByModel[model] += wordCount;
            avgWordLengthByModel[model].push(avgWordLength);

            // Simple complexity score based on avg word length and sentence count
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const avgSentenceLength = wordCount / (sentences.length || 1);
            const complexity = (avgWordLength * 0.6) + (avgSentenceLength * 0.4);
            complexityScores[model].push(complexity);
        });

        // Now run sentiment analysis - this may take some time
        setSentimentProcessing(true);

        try {
            // First, ensure we initialize sentiment arrays for all models
            Object.keys(modelResponseLengths).forEach(model => {
                if (!sentimentScores[model]) sentimentScores[model] = [];
                if (!sentimentMagnitudes[model]) sentimentMagnitudes[model] = [];
            });

            // Process sentiment analysis for each response
            for (const response of responses) {
                if (!response || response.error) continue;

                const model = response.model;
                const text = response.text;

                try {
                    // Call the sentiment analysis with fallback
                    const sentiment = await analyzeSentiment(text, model);

                    // Update flag if response used GCP API
                    if (sentiment.success) {
                        setIsUsingSentimentAPI(true);
                    }

                    console.log(`Model: ${model}, Score: ${sentiment.score}, Magnitude: ${sentiment.magnitude}`);

                    // Store sentiment scores and magnitudes with stricter validation
                    sentimentScores[model].push(
                        sentiment.score !== undefined && sentiment.score !== null ? Number(sentiment.score) : 0
                    );
                    sentimentMagnitudes[model].push(
                        sentiment.magnitude !== undefined && sentiment.magnitude !== null ? Number(sentiment.magnitude) : 0
                    );
                } catch (error) {
                    console.error(`Sentiment analysis failed for ${model}:`, error);
                    sentimentScores[model].push(0);
                    sentimentMagnitudes[model].push(0);
                }
            }
        } catch (error) {
            console.error("Error in sentiment analysis:", error);
        } finally {
            // Ensure every model has at least one sentiment score
            Object.keys(modelResponseLengths).forEach(model => {
                if (!sentimentScores[model] || sentimentScores[model].length === 0) {
                    sentimentScores[model] = [0];
                }
                if (!sentimentMagnitudes[model] || sentimentMagnitudes[model].length === 0) {
                    sentimentMagnitudes[model] = [0];
                }
            });
            console.log("Final sentiment scores:", sentimentScores);
            console.log("Final sentiment magnitudes:", sentimentMagnitudes);
            setSentimentProcessing(false);
        }

        // Calculate averages and prepare for display
        const avgResponseLengths = {};
        const avgWordLengths = {};
        const avgSentiment = {};
        const avgSentimentMagnitude = {};
        const avgComplexity = {};
        const avgResponseSpeed = {};

        Object.keys(modelResponseLengths).forEach(model => {
            const lengths = modelResponseLengths[model];
            avgResponseLengths[model] = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;

            const wordLengths = avgWordLengthByModel[model];
            avgWordLengths[model] = wordLengths.reduce((sum, len) => sum + len, 0) / wordLengths.length;

            // More robust calculation for sentiment scores
            const sentiments = sentimentScores[model];
            if (sentiments && sentiments.length > 0) {
                // Convert all values to numbers and handle any NaN
                const validScores = sentiments.map(s => Number(s)).filter(s => !isNaN(s));
                
                if (validScores.length > 0) {
                    // Calculate average of valid scores
                    avgSentiment[model] = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
                    console.log(`Average sentiment for ${model}: ${avgSentiment[model]} (from ${validScores.length} values)`);
                } else {
                    // If no valid scores, set to 0 (neutral)
                    avgSentiment[model] = 0;
                    console.log(`No valid sentiment scores for ${model}, setting average to 0`);
                }
            } else {
                // If no scores array, set to 0 (neutral)
                avgSentiment[model] = 0;
                console.log(`No sentiment scores for ${model}, setting average to 0`);
            }

            // Similarly for magnitude
            const magnitudes = sentimentMagnitudes[model];
            if (magnitudes && magnitudes.length > 0) {
                const validMagnitudes = magnitudes.map(m => Number(m)).filter(m => !isNaN(m));
                
                if (validMagnitudes.length > 0) {
                    avgSentimentMagnitude[model] = validMagnitudes.reduce((sum, mag) => sum + mag, 0) / validMagnitudes.length;
                    console.log(`Average magnitude for ${model}: ${avgSentimentMagnitude[model]} (from ${validMagnitudes.length} values)`);
                } else {
                    avgSentimentMagnitude[model] = 0;
                    console.log(`No valid sentiment magnitudes for ${model}, setting average to 0`);
                }
            } else {
                avgSentimentMagnitude[model] = 0;
                console.log(`No sentiment magnitudes for ${model}, setting average to 0`);
            }

            const complexities = complexityScores[model];
            avgComplexity[model] = complexities.reduce((sum, score) => sum + score, 0) / complexities.length;

            const responseTimes = responseSpeedByModel[model];
            avgResponseSpeed[model] = responseTimes.length > 0 ? 
                responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
        });

        setMetrics({
            responsesByChars: avgResponseLengths,
            responsesByWords: totalWordsByModel,
            avgWordLength: avgWordLengths,
            sentiment: avgSentiment,
            sentimentMagnitude: avgSentimentMagnitude,
            isAdvancedSentiment: isUsingSentimentAPI,
            complexity: avgComplexity,
            responseSpeed: avgResponseSpeed,
            promptTokens: promptTokensByModel,
            completionTokens: completionTokensByModel,
            totalTokens: totalTokensByModel
        });
    };

    if (!metrics || sentimentProcessing) {
        return <div className="p-4 text-center opacity-60">
            {sentimentProcessing ? 
                <>
                    <div className="loading loading-spinner loading-sm mb-2"></div>
                    <p className="text-sm">Analyzing sentiment data...</p>
                </> : 
                "Calculating metrics..."
            }
        </div>;
    }

    // Prepare chart data
    const models = Object.keys(metrics.responsesByChars);
    const chartColors = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 205, 86, 0.8)',
    ];

    // Default chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 12,
                    padding: 10,
                    font: {
                        size: 11
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.dataset.label || '';
                        const value = context.raw.toFixed(2);
                        return `${label}: ${value}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    font: {
                        size: 10
                    }
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 10
                    }
                }
            }
        }
    };

    // Chart data based on active tab
    let chartData = null;
    
    if (activeTab === 'length') {
        chartData = {
            labels: models,
            datasets: [{
                label: 'Response Length (Chars)',
                data: models.map(model => metrics.responsesByChars[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            }]
        };
    } else if (activeTab === 'words') {
        chartData = {
            labels: models,
            datasets: [{
                label: 'Total Words',
                data: models.map(model => metrics.responsesByWords[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            }]
        };
    } else if (activeTab === 'complexity') {
        chartData = {
            labels: models,
            datasets: [{
                label: 'Complexity Score',
                data: models.map(model => metrics.complexity[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            }]
        };
    } else if (activeTab === 'sentiment') {
        chartData = {
            labels: models,
            datasets: [
                {
                    label: 'Sentiment Score',
                    data: models.map(model => {
                        // Strict validation - explicitly check if it's a number (including 0)
                        const val = metrics.sentiment[model];
                        if (val === null || val === undefined || 
                            (typeof val !== 'number' && isNaN(Number(val)))) {
                            console.warn(`Invalid sentiment value for ${model}:`, val);
                            return 0;
                        }
                        return val;
                    }),
                    backgroundColor: chartColors.map(c => c.replace('0.8', '0.6')),
                    borderColor: chartColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                ...(metrics.isAdvancedSentiment ? [{
                    label: 'Sentiment Magnitude',
                    data: models.map(model => {
                        // Also check explicitly for zero values in magnitude
                        const val = metrics.sentimentMagnitude[model];
                        if (val === null || val === undefined || 
                           (typeof val !== 'number' && isNaN(Number(val)))) {
                            console.warn(`Invalid magnitude value for ${model}:`, val);
                            return 0;
                        }
                        return val;
                    }),
                    backgroundColor: chartColors.map(c => c.replace('0.8', '0.9')),
                    borderColor: chartColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1,
                    type: 'line',
                    yAxisID: 'y1',
                }] : []),
            ]
        };
        
        // Custom options for sentiment chart
        chartOptions.scales = {
            y: {
                beginAtZero: false,
                min: -1,
                max: 1,
                title: {
                    display: true,
                    text: 'Sentiment Score'
                },
                ticks: {
                    font: { size: 10 },
                    callback: function(value) {
                        if (value === -1) return 'Very Neg';
                        if (value === -0.5) return 'Neg';
                        if (value === 0) return 'Neutral';
                        if (value === 0.5) return 'Pos';
                        if (value === 1) return 'Very Pos';
                        return '';
                    }
                }
            },
            ...(metrics.isAdvancedSentiment ? {
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Magnitude'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    suggestedMax: Math.max(5, ...models.map(m => metrics.sentimentMagnitude[m] || 0) * 1.1),
                    ticks: {
                        font: { size: 10 }
                    }
                }
            } : {})
        };
        
        chartOptions.plugins.tooltip = {
            callbacks: {
                label: function(context) {
                    const datasetLabel = context.dataset.label;
                    const value = context.parsed.y;
                    
                    if (datasetLabel === 'Sentiment Score') {
                        let sentiment = 'Neutral';
                        if (value < -0.75) sentiment = 'Very Negative';
                        else if (value < -0.25) sentiment = 'Negative';
                        else if (value < 0.25) sentiment = 'Neutral';
                        else if (value < 0.75) sentiment = 'Positive';
                        else sentiment = 'Very Positive';
                        
                        return `${datasetLabel}: ${value.toFixed(2)} (${sentiment})`;
                    } else {
                        return `${datasetLabel}: ${value.toFixed(2)}`;
                    }
                }
            }
        };
    } else if (activeTab === 'speed') {
        chartData = {
            labels: models,
            datasets: [{
                label: 'Response Time (ms)',
                data: models.map(model => metrics.responseSpeed[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            }]
        };
    } else if (activeTab === 'tokens' && Object.values(metrics.promptTokens).some(val => val > 0)) {
        chartData = {
            labels: models,
            datasets: [
                {
                    label: 'Prompt Tokens',
                    data: models.map(model => metrics.promptTokens[model] || 0),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Completion Tokens',
                    data: models.map(model => metrics.completionTokens[model] || 0),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                }
            ]
        };
        
        // Custom options for tokens chart
        chartOptions.scales = {
            x: {
                stacked: false,
                ticks: {
                    font: { size: 10 }
                }
            },
            y: {
                stacked: false,
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Token Count'
                },
                ticks: {
                    font: { size: 10 }
                }
            }
        };
    }

    // Determine if we should show the tokens tab
    const hasTokenData = Object.values(metrics.promptTokens).some(val => val > 0);

    return (
        <div className="bg-base-200 p-4 rounded-lg">
            <div className="tabs tabs-boxed mb-3 justify-center">
                <a 
                    className={`tab tab-xs sm:tab-sm ${activeTab === 'length' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('length')}
                >
                    Length
                </a>
                <a 
                    className={`tab tab-xs sm:tab-sm ${activeTab === 'words' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('words')}
                >
                    Words
                </a>
                <a 
                    className={`tab tab-xs sm:tab-sm ${activeTab === 'complexity' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('complexity')}
                >
                    Complexity
                </a>
                <a 
                    className={`tab tab-xs sm:tab-sm ${activeTab === 'sentiment' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('sentiment')}
                >
                    Sentiment
                </a>
                <a 
                    className={`tab tab-xs sm:tab-sm ${activeTab === 'speed' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('speed')}
                >
                    Speed
                </a>
                {hasTokenData && (
                    <a 
                        className={`tab tab-xs sm:tab-sm ${activeTab === 'tokens' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('tokens')}
                    >
                        Tokens
                    </a>
                )}
            </div>
            
            {chartData && (
                <div className="h-48">
                    <Bar 
                        data={chartData} 
                        options={{
                            ...chartOptions,
                            parsing: {
                                // This tells Chart.js to not filter out zero values
                                yAxisKey: 'y'
                            }
                        }} 
                    />
                </div>
            )}
            
            {activeTab === 'sentiment' && metrics.isAdvancedSentiment && (
                <div className="mt-3 bg-base-300 p-2 rounded-md text-xs">
                    <div className="flex items-center">
                        <span className="badge badge-sm badge-info mr-1">i</span>
                        <span>Using Google Cloud Natural Language API for sentiment analysis</span>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {models.map((model, i) => (
                    <div key={model} className="p-2 bg-base-100 rounded text-center text-xs sm:text-sm">
                        <div className="font-semibold">{model}</div>
                        <div className="flex flex-col gap-1 mt-1">
                            <div>
                                <span className="opacity-70">Chars:</span> {Math.round(metrics.responsesByChars[model])}
                            </div>
                            <div>
                                <span className="opacity-70">Words:</span> {Math.round(metrics.responsesByWords[model])}
                            </div>
                            <div>
                                <span className="opacity-70">Sentiment:</span> {
                                    (() => {
                                        const val = metrics.sentiment[model];
                                        if (val === null || val === undefined || isNaN(Number(val))) {
                                            return "0.00";
                                        }
                                        return Number(val).toFixed(2);
                                    })()
                                }
                            </div>
                            {metrics.responseSpeed[model] > 0 && (
                                <div>
                                    <span className="opacity-70">Time:</span> {(metrics.responseSpeed[model]/1000).toFixed(1)}s
                                </div>
                            )}
                            {metrics.promptTokens[model] > 0 && (
                                <div>
                                    <span className="opacity-70">Tokens:</span> {metrics.totalTokens[model] || 
                                        (metrics.promptTokens[model] + metrics.completionTokens[model])}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {models.length > 0 && activeTab === 'sentiment' && (
                <div className="mt-4 text-xs opacity-80">
                    <p>
                        Sentiment ranges from -1 (negative) to +1 (positive). 
                        {metrics.isAdvancedSentiment ? 
                            " Values closer to zero with high magnitude may indicate mixed sentiment." : 
                            " Basic keyword analysis may not capture all nuances."}
                    </p>
                </div>
            )}
        </div>
    );
}