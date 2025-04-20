"use client";

import { useState, useEffect } from "react";
import { Chart, registerables } from 'chart.js';
import { Bar, Doughnut, PolarArea } from 'react-chartjs-2';
import { analyzeSentiment } from "../lib/sentiment";

// Register ChartJS components
if (typeof window !== 'undefined') {
    Chart.register(...registerables);
}

export default function ResponseAnalytics({ responses, responsesByPrompt }) {
    const [metrics, setMetrics] = useState(null);
    const [activeTab, setActiveTab] = useState('length');
    const [isUsingSentimentAPI, setIsUsingSentimentAPI] = useState(false);
    const [sentimentProcessing, setSentimentProcessing] = useState(false);

    useEffect(() => {
        if (responses && responses.length > 0) {
            calculateMetrics(responses, responsesByPrompt);
        }
    }, [responses, responsesByPrompt]);

    const calculateMetrics = async (responses, responsesByPrompt) => {
        // Basic metrics
        const modelResponseLengths = {};
        const modelResponseTimes = {};
        const totalWordsByModel = {};
        const avgWordLengthByModel = {};
        const sentimentScores = {};
        const sentimentMagnitudes = {};
        const complexityScores = {};
        const promptTokensByModel = {};
        const completionTokensByModel = {};
        const totalTokensByModel = {};
        const responseSpeedByModel = {};

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

            if (!responseSpeedByModel[model]) {
                responseSpeedByModel[model] = [];
            }

            // Add response time if available
            if (response.responseTime) {
                responseSpeedByModel[model].push(response.responseTime);
            }

            // Initialize if first time seeing this model
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
                    // Call the GCP sentiment analysis with fallback
                    const sentiment = await analyzeSentiment(text, model);

                    // Update flag if at least one response used GCP sentiment API
                    if (sentiment.success) {
                        setIsUsingSentimentAPI(true);
                    }

                    console.log(`Model: ${model}, Score: ${sentiment.score}, Magnitude: ${sentiment.magnitude}`);

                    // Store sentiment scores and magnitudes with stricter validation
                    sentimentScores[model].push(
                        sentiment.score !== undefined && sentiment.score !== null ? sentiment.score : 0
                    );
                    sentimentMagnitudes[model].push(
                        sentiment.magnitude !== undefined && sentiment.magnitude !== null ? sentiment.magnitude : 0
                    );
                } catch (modelError) {
                    // If individual model sentiment analysis fails, use neutral values
                    console.error(`Sentiment analysis failed for ${model}:`, modelError);
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
                    sentimentScores[model] = [0]; // Default to neutral
                }
                if (!sentimentMagnitudes[model] || sentimentMagnitudes[model].length === 0) {
                    sentimentMagnitudes[model] = [0]; // Default to zero magnitude
                }
            });
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

            const sentiments = sentimentScores[model] || [0];
            avgSentiment[model] = sentiments.length > 0 ?
                sentiments.reduce((sum, score) => sum + score, 0) / sentiments.length : 0;

            const magnitudes = sentimentMagnitudes[model] || [0];
            avgSentimentMagnitude[model] = magnitudes.length > 0 ?
                magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length : 0;


            const complexities = complexityScores[model];
            avgComplexity[model] = complexities.reduce((sum, score) => sum + score, 0) / complexities.length;

            const responseTimes = responseSpeedByModel[model];
            avgResponseSpeed[model] = responseTimes.length > 0
                ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
                : 0;
        });

        // Calculate response times per prompt if available
        const promptResponseTimes = {};
        if (responsesByPrompt && responsesByPrompt.length > 0) {
            responsesByPrompt.forEach((promptResponses, index) => {
                promptResponseTimes[`Prompt ${index + 1}`] = {};
                promptResponses.forEach(response => {
                    const model = response.model;
                    promptResponseTimes[`Prompt ${index + 1}`][model] = response.responseTime || 0;
                });
            });
        }

        setMetrics({
            responsesByChars: avgResponseLengths,
            responsesByWords: totalWordsByModel,
            avgWordLength: avgWordLengths,
            sentiment: avgSentiment,
            sentimentMagnitude: avgSentimentMagnitude,
            isAdvancedSentiment: isUsingSentimentAPI,
            complexity: avgComplexity,
            promptResponseTimes,
            promptTokens: promptTokensByModel,
            completionTokens: completionTokensByModel,
            totalTokens: totalTokensByModel,
            responseSpeed: avgResponseSpeed
        });
    };

    if (!metrics) {
        return <div className="p-8 text-center opacity-60">
            {sentimentProcessing ?
                <>
                    <div className="loading loading-spinner loading-md mb-4"></div>
                    <p>Analyzing sentiment data...</p>
                </> :
                "No data available for analytics"
            }
        </div>;
    }


    if (!metrics) {
        return <div className="p-8 text-center opacity-60">No data available for analytics</div>;
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

    // Chart data for response length
    const lengthChartData = {
        labels: models,
        datasets: [
            {
                label: 'Average Response Length (Characters)',
                data: models.map(model => metrics.responsesByChars[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            },
        ],
    };

    // Chart data for word counts
    const wordChartData = {
        labels: models,
        datasets: [
            {
                label: 'Total Words',
                data: models.map(model => metrics.responsesByWords[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            },
        ],
    };

    // Chart data for complexity
    const complexityChartData = {
        labels: models,
        datasets: [
            {
                label: 'Complexity Score',
                data: models.map(model => metrics.complexity[model]),
                backgroundColor: chartColors,
                borderColor: chartColors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
            },
        ],
    };

    // Chart data for sentiment
    const sentimentChartData = {
        labels: models,
        datasets: [
            {
                label: 'Sentiment Score',
                data: models.map(model => {
                    // Strict validation with fallback to neutral (0)
                    const val = metrics.sentiment[model];
                    if (val === null || val === undefined || isNaN(val)) {
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
                    // Strict validation with fallback to zero
                    const val = metrics.sentimentMagnitude[model];
                    if (val === null || val === undefined || isNaN(val)) {
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
        ],
    };

    // Prompt response time chart data if available
    let promptTimeChartData = null;
    if (Object.keys(metrics.promptResponseTimes).length > 0) {
        const prompts = Object.keys(metrics.promptResponseTimes);
        promptTimeChartData = {
            labels: prompts,
            datasets: models.map((model, index) => ({
                label: model,
                data: prompts.map(prompt =>
                    metrics.promptResponseTimes[prompt][model] || 0
                ),
                backgroundColor: chartColors[index % chartColors.length],
                borderColor: chartColors[index % chartColors.length].replace('0.8', '1'),
                borderWidth: 1,
            })),
        };
    }

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
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
            }
        },
    };

    const sentimentChartOptions = {
        ...chartOptions,
        scales: {
            y: {
                beginAtZero: false,
                min: -1,
                max: 1,
                title: {
                    display: true,
                    text: 'Sentiment Score'
                },
                ticks: {
                    callback: function (value) {
                        if (value === -1) return 'Very Negative';
                        if (value === -0.5) return 'Negative';
                        if (value === 0) return 'Neutral';
                        if (value === 0.5) return 'Positive';
                        if (value === 1) return 'Very Positive';
                        return value;
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
                    suggestedMax: 5, // Most texts have magnitudes under 5
                }
            } : {})
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function (context) {
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
            },
            legend: {
                position: 'top',
            }
        }
    };

    const isSingleModel = models.length === 1;

    return (
        <div className="card bg-base-100 shadow-sm overflow-hidden">
            <div className="card-body p-4">
                <h3 className="font-medium text-lg mb-4">
                    {isSingleModel ? `${models[0]} Response Analytics` : "Response Analytics"}
                </h3>

                {/* Only show tabs for multi-model case */}
                {!isSingleModel && (
                    <div className="tabs tabs-boxed mb-4">
                        <div className="tabs tabs-boxed mb-4">
                            <button
                                className={`tab ${activeTab === 'length' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('length')}
                            >
                                Length
                            </button>
                            <button
                                className={`tab ${activeTab === 'words' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('words')}
                            >
                                Words
                            </button>
                            <button
                                className={`tab ${activeTab === 'complexity' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('complexity')}
                            >
                                Complexity
                            </button>
                            <button
                                className={`tab ${activeTab === 'sentiment' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('sentiment')}
                            >
                                Sentiment
                            </button>
                            {promptTimeChartData && (
                                <button
                                    className={`tab ${activeTab === 'promptTimes' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('promptTimes')}
                                >
                                    Prompt Times
                                </button>
                            )}
                            {Object.keys(metrics.promptTokens).length > 0 && (
                                <button
                                    className={`tab ${activeTab === 'tokens' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('tokens')}
                                >
                                    Token Usage
                                </button>
                            )}
                            <button
                                className={`tab ${activeTab === 'speed' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('speed')}
                            >
                                Response Speed
                            </button>

                        </div>
                    </div>
                )}


                <div className="h-80">
                    {/* Single model case - show a more focused single-model dashboard */}
                    {isSingleModel ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card bg-base-200 p-4 text-center">
                                <div className="stat-title">Characters</div>
                                <div className="text-3xl font-bold">{Math.round(metrics.responsesByChars[models[0]])}</div>
                            </div>
                            <div className="card bg-base-200 p-4 text-center">
                                <div className="stat-title">Words</div>
                                <div className="text-3xl font-bold">{Math.round(metrics.responsesByWords[models[0]])}</div>
                            </div>
                            <div className="card bg-base-200 p-4 text-center">
                                <div className="stat-title">Complexity</div>
                                <div className="text-3xl font-bold">{metrics.complexity[models[0]].toFixed(2)}</div>
                            </div>
                            <div className="card bg-base-200 p-4 text-center">
                                <div className="stat-title">Sentiment</div>
                                <div className="text-3xl font-bold">
                                    {(() => {
                                        const val = metrics.sentiment[models[0]];
                                        if (val === null || val === undefined || isNaN(val)) {
                                            return '0.00';
                                        }
                                        return val.toFixed(2);
                                    })()}
                                </div>
                                <div className="text-xs mt-1">
                                    {(() => {
                                        const val = metrics.sentiment[models[0]];
                                        if (val === null || val === undefined || isNaN(val)) {
                                            return 'Neutral';
                                        }
                                        return val < -0.25 ? 'Negative' : val > 0.25 ? 'Positive' : 'Neutral';
                                    })()}
                                </div>
                            </div>
                            {metrics.promptTokens[models[0]] > 0 && (
                                <>
                                    <div className="card bg-base-200 p-4 text-center">
                                        <div className="stat-title">Prompt Tokens</div>
                                        <div className="text-3xl font-bold">{metrics.promptTokens[models[0]]}</div>
                                    </div>
                                    <div className="card bg-base-200 p-4 text-center">
                                        <div className="stat-title">Completion Tokens</div>
                                        <div className="text-3xl font-bold">{metrics.completionTokens[models[0]]}</div>
                                    </div>
                                    <div className="card bg-base-200 p-4 text-center">
                                        <div className="stat-title">Total Tokens</div>
                                        <div className="text-3xl font-bold">
                                            {metrics.totalTokens[models[0]] ||
                                                metrics.promptTokens[models[0]] + metrics.completionTokens[models[0]]}
                                        </div>
                                    </div>
                                </>
                            )}
                            {metrics.responseSpeed && metrics.responseSpeed[models[0]] > 0 && (
                                <div className="card bg-base-200 p-4 text-center">
                                    <div className="stat-title">Response Time</div>
                                    <div className="text-3xl font-bold">
                                        {Math.round(metrics.responseSpeed[models[0]])} ms
                                    </div>
                                    <div className="text-xs mt-1">
                                        ({(metrics.responseSpeed[models[0]] / 1000).toFixed(2)} seconds)
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Multi-model case - show regular charts */
                        <>
                            {activeTab === 'length' && <Bar data={lengthChartData} options={chartOptions} />}
                            {activeTab === 'words' && <Bar data={wordChartData} options={chartOptions} />}
                            {activeTab === 'complexity' && <Bar data={complexityChartData} options={chartOptions} />}
                            {activeTab === 'sentiment' && (
                                <div>
                                    <div className="h-64">
                                        <Bar data={sentimentChartData} options={{
                                            ...sentimentChartOptions,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                ...sentimentChartOptions.plugins,
                                                legend: {
                                                    position: 'top',
                                                    align: 'center',
                                                    labels: {
                                                        boxWidth: 12,
                                                        padding: 15
                                                    }
                                                }
                                            }
                                        }} />
                                    </div>
                                    <div className="mt-6 text-sm">
                                        {metrics.isAdvancedSentiment ? (
                                            <div className="card bg-base-200 p-4">
                                                <h3 className="font-medium mb-2">About Sentiment Analysis</h3>
                                                <p>Using Google Cloud Natural Language API for advanced sentiment analysis.</p>
                                                <ul className="list-disc pl-5 mt-2 text-xs">
                                                    <li><strong>Score:</strong> -1.0 (negative) to 1.0 (positive)</li>
                                                    <li><strong>Magnitude:</strong> Overall strength of emotion (0 to infinity)</li>
                                                    <li>High magnitude with neutral score indicates mixed sentiment</li>
                                                </ul>
                                            </div>
                                        ) : (
                                            <>
                                                <p><strong>Note:</strong> Using basic sentiment analysis based on keyword matching.</p>
                                                <p className="text-xs mt-1">To enable advanced sentiment analysis, configure Google Cloud Project ID and enable Natural Language API.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activeTab === 'promptTimes' && promptTimeChartData && (
                                <Bar
                                    data={promptTimeChartData}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            x: {
                                                stacked: false,
                                            },
                                            y: {
                                                stacked: false,
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: 'Response Time (estimated)'
                                                }
                                            }
                                        }
                                    }}
                                />
                            )}
                            {activeTab === 'tokens' && Object.keys(metrics.promptTokens).length > 0 && (
                                <Bar
                                    data={{
                                        labels: models,
                                        datasets: [
                                            {
                                                label: 'Prompt Tokens',
                                                data: models.map(model => metrics.promptTokens[model] || 0),
                                                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                                            },
                                            {
                                                label: 'Completion Tokens',
                                                data: models.map(model => metrics.completionTokens[model] || 0),
                                                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                                            }
                                        ],
                                    }}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            x: {
                                                stacked: false,
                                            },
                                            y: {
                                                stacked: false,
                                                beginAtZero: true,
                                            }
                                        }
                                    }}
                                />
                            )}
                            {activeTab === 'speed' && (
                                <Bar
                                    data={{
                                        labels: models,
                                        datasets: [
                                            {
                                                label: 'Response Time (ms)',
                                                data: models.map(model => metrics.responseSpeed[model] || 0),
                                                backgroundColor: chartColors,
                                            }
                                        ],
                                    }}
                                    options={chartOptions}
                                />
                            )}
                        </>
                    )}
                </div>

                <div className="mt-4 text-sm opacity-70">
                    <p><strong>Note:</strong> These metrics are approximate and based on text analysis of the responses.</p>
                    <ul className="list-disc pl-5 mt-2">
                        <li><strong>Length</strong>: Character count of responses</li>
                        <li><strong>Words</strong>: Total words in responses</li>
                        <li><strong>Complexity</strong>: Calculated based on word and sentence length</li>
                        <li><strong>Sentiment</strong>: Basic positive/negative word analysis</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}