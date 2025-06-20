document.addEventListener('DOMContentLoaded', () => {
    const exchangeSelect = document.getElementById('exchange');
    const companySelectionSection = document.getElementById('company-selection');
    const companySearchInput = document.getElementById('company-search');
    const companyDropdown = document.getElementById('company-dropdown');
    const companyDropdownList = companyDropdown.querySelector('ul');
    const selectedCompanySymbolInput = document.getElementById('selected-company-symbol');
    const selectedCompanyDisplay = document.getElementById('selected-company-display');
    const dateSelectionSection = document.getElementById('date-selection');
    const predictionDateInput = document.getElementById('prediction-date');
    const predictButton = document.getElementById('predict-button');
    const predictionResultsSection = document.getElementById('prediction-results');
    const predictedPriceParagraph = document.getElementById('predicted-price');
    const percentageDeviationParagraph = document.getElementById('percentage-deviation');
    const priceGraphSection = document.getElementById('price-graph');
    const dailyPriceChartCanvas = document.getElementById('daily-price-chart');

    // Include Chart.js library
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    document.head.appendChild(script);

    let allCompaniesForCurrentExchange = []; // Stores companies fetched from backend
    let dailyPriceChart = null; // Chart.js instance

    // --- Backend API Endpoint Configuration ---
    const API_BASE_URL = 'https://indianapi.in/indian-stock-market';
    const API_KEY = 'sk-live-4DEFuz0fyi1VFv6Cr461FbGASOKyhK4WcIy7XbIu';
    const GET_COMPANIES_ENDPOINT = `${API_BASE_URL}/api/companies`;
    const PREDICT_PRICE_ENDPOINT = `${API_BASE_URL}/api/predict`;
    const GET_DAILY_PRICES_ENDPOINT = `${API_BASE_URL}/api/daily-prices`;

    // --- Event Listeners ---

    exchangeSelect.addEventListener('change', async () => {
        const selectedExchange = exchangeSelect.value;
        if (selectedExchange) {
            companySelectionSection.style.display = 'block';
            dateSelectionSection.style.display = 'block';
            priceGraphSection.style.display = 'none';
            companySearchInput.value = '';
            selectedCompanySymbolInput.value = '';
            selectedCompanyDisplay.textContent = '';
            companyDropdownList.innerHTML = '';
            predictButton.disabled = true;
            predictionResultsSection.style.display = 'none';
            percentageDeviationParagraph.textContent = '';
            if (dailyPriceChart) {
                dailyPriceChart.destroy();
                dailyPriceChart = null;
            }

            // Fetch companies from backend
            try {
                companySearchInput.placeholder = "Loading companies...";
                companySearchInput.disabled = true;

                const response = await fetch(`${GET_COMPANIES_ENDPOINT}?exchange=${selectedExchange}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });
                if (!response.ok) {
                    const errorDetails = await response.text();
                    throw new Error(`HTTP error fetching companies from backend! Status: ${response.status}, Details: ${errorDetails}`);
                }
                allCompaniesForCurrentExchange = await response.json();

                console.log(`Loaded ${allCompaniesForCurrentExchange.length} companies for ${selectedExchange} from backend.`);

                companySearchInput.placeholder = "Type to search company...";
                companySearchInput.disabled = false;
            } catch (error) {
                console.error('Error fetching companies from backend:', error);
                companySearchInput.placeholder = "Failed to load companies.";
                companySearchInput.disabled = true;
                alert(`Failed to load companies. Ensure the API is accessible. Error: ${error.message}`);
            }

        } else {
            companySelectionSection.style.display = 'none';
            dateSelectionSection.style.display = 'none';
            priceGraphSection.style.display = 'none';
            predictButton.disabled = true;
            predictionResultsSection.style.display = 'none';
            percentageDeviationParagraph.textContent = '';
            allCompaniesForCurrentExchange = [];
            companySearchInput.disabled = false;
            if (dailyPriceChart) {
                dailyPriceChart.destroy();
                dailyPriceChart = null;
            }
        }
    });

    companySearchInput.addEventListener('input', () => {
        const searchTerm = companySearchInput.value.toLowerCase();
        companyDropdownList.innerHTML = '';
        companyDropdown.style.display = 'none';

        if (searchTerm.length > 1 && allCompaniesForCurrentExchange.length > 0) {
            const filteredCompanies = allCompaniesForCurrentExchange.filter(company =>
                company.name.toLowerCase().includes(searchTerm)
            ).slice(0, 20);

            if (filteredCompanies.length > 0) {
                filteredCompanies.forEach(company => {
                    const listItem = document.createElement('li');
                    listItem.textContent = company.name;
                    listItem.dataset.symbol = company.symbol;
                    listItem.addEventListener('click', () => {
                        companySearchInput.value = company.name;
                        selectedCompanySymbolInput.value = company.symbol;
                        selectedCompanyDisplay.textContent = `Selected: ${company.name} (${company.symbol})`;
                        companyDropdown.style.display = 'none';
                        checkPredictButtonStatus();
                    });
                    companyDropdownList.appendChild(listItem);
                });
                companyDropdown.style.display = 'block';
            }
        }
        checkPredictButtonStatus();
    });

    document.addEventListener('click', (event) => {
        if (!companyDropdown.contains(event.target) && event.target !== companySearchInput) {
            companyDropdown.style.display = 'none';
        }
    });

    predictionDateInput.addEventListener('change', () => {
        checkPredictButtonStatus();
    });

    predictButton.addEventListener('click', async () => {
        const selectedExchange = exchangeSelect.value;
        const selectedCompanySymbol = selectedCompanySymbolInput.value;
        const predictionDate = predictionDateInput.value;

        if (selectedExchange && selectedCompanySymbol && predictionDate) {
            predictButton.disabled = true;
            predictButton.textContent = 'Predicting...';
            predictedPriceParagraph.textContent = 'Fetching prediction...';
            percentageDeviationParagraph.textContent = 'Calculating deviation...';
            predictionResultsSection.style.display = 'block';
            priceGraphSection.style.display = 'block';

            try {
                // Fetch prediction
                const predictResponse = await fetch(PREDICT_PRICE_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify({
                        exchange: selectedExchange,
                        companySymbol: selectedCompanySymbol,
                        predictionDate: predictionDate
                    })
                });

                if (!predictResponse.ok) {
                    const errorDetails = await predictResponse.text();
                    throw new Error(`Prediction failed from backend! Status: ${predictResponse.status}, Details: ${errorDetails}`);
                }

                const predictResult = await predictResponse.json();
                const predictedPrice = parseFloat(predictResult.predictedPrice.replace('₹', ''));

                predictedPriceParagraph.textContent = `Predicted price for ${selectedCompanySymbol} on ${predictionDate}: ₹${predictedPrice.toFixed(2)}`;

                // Fetch daily prices for the graph and deviation
                const dailyPricesResponse = await fetch(`${GET_DAILY_PRICES_ENDPOINT}?exchange=${selectedExchange}&symbol=${selectedCompanySymbol}&date=${predictionDate}`, {
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });
                if (!dailyPricesResponse.ok) {
                    const errorDetails = await dailyPricesResponse.text();
                    throw new Error(`Failed to fetch daily prices! Status: ${dailyPricesResponse.status}, Details: ${errorDetails}`);
                }

                const dailyPricesResult = await dailyPricesResponse.json();
                const { actualPrice, prices, times } = dailyPricesResult;

                // Calculate percentage deviation
                const deviation = ((actualPrice - predictedPrice) / actualPrice) * 100;
                percentageDeviationParagraph.textContent = `Percentage Deviation from Actual Price: ${deviation.toFixed(2)}%`;

                // Render price graph
                if (dailyPriceChart) {
                    dailyPriceChart.destroy();
                }
                dailyPriceChart = new Chart(dailyPriceChartCanvas, {
                    type: 'line',
                    data: {
                        labels: times,
                        datasets: [{
                            label: 'Stock Price (₹)',
                            data: prices,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            fill: false
                        }, {
                            label: 'Predicted Price',
                            data: Array(times.length).fill(predictedPrice),
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderDash: [5, 5],
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Time'
                                }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Price (₹)'
                                }
                            }
                        }
                    }
                });

            } catch (error) {
                console.error('Error during prediction or daily prices request:', error);
                predictedPriceParagraph.textContent = `Error: Could not get prediction. Ensure the API is accessible. ${error.message}`;
                percentageDeviationParagraph.textContent = 'Error: Could not calculate deviation.';
                priceGraphSection.style.display = 'none';
            } finally {
                predictButton.disabled = false;
                predictButton.textContent = 'Predict the Price';
            }
        } else {
            alert("Please select an exchange, a company, and a prediction date.");
        }
    });

    // --- Helper Function to Enable/Disable Predict Button ---
    function checkPredictButtonStatus() {
        const selectedExchange = exchangeSelect.value;
        const selectedCompany = selectedCompanySymbolInput.value;
        const predictionDate = predictionDateInput.value;

        if (selectedExchange && selectedCompany && predictionDate && allCompaniesForCurrentExchange.length > 0) {
            predictButton.disabled = false;
        } else {
            predictButton.disabled = true;
        }
    }

    // Set minimum date for prediction to today
    predictionDateInput.min = '2025-06-20';
});