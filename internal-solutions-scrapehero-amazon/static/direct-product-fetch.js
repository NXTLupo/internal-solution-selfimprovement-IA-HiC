/**
 * Direct Product Fetch Script for LLM Analysis
 * This script provides direct fetching of product data for LLM analysis
 * when no product cards are found on the page.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add direct fetch button to AI section
    const aiContainer = document.querySelector('.ai-analysis-container');
    if (aiContainer) {
        const fetchProductsBtn = document.createElement('button');
        fetchProductsBtn.className = 'btn btn-warning';
        fetchProductsBtn.style = 'width: 100%; margin-bottom: 15px;';
        fetchProductsBtn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Fetch Products for Analysis';
        
        // Insert at top of container
        aiContainer.insertBefore(fetchProductsBtn, aiContainer.firstChild);
        
        // Add click event
        fetchProductsBtn.addEventListener('click', async function() {
            try {
                await fetchProductsDirectly();
            } catch (error) {
                console.error("Error fetching products:", error);
                alert(`Failed to fetch products: ${error.message}`);
            }
        });
    }
    
    // Directly fetch products from API
    async function fetchProductsDirectly() {
        // Get input from any search field that's available
        let searchTerm = '';
        const possibleInputs = [
            document.getElementById('categoryUrl'),
            document.getElementById('insightSearch'),
            document.getElementById('url')
        ];
        
        for (const input of possibleInputs) {
            if (input && input.value.trim()) {
                searchTerm = input.value.trim();
                break;
            }
        }
        
        if (!searchTerm) {
            // Ask user for search term if none found
            searchTerm = prompt("Enter a product category to analyze (e.g., 'wireless headphones'):");
            if (!searchTerm) return;
        }
        
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-indicator"></div>
                <p>Fetching products for "${searchTerm}"...</p>
            </div>
        `;
        loadingDiv.style = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; justify-content: center; align-items: center;';
        document.body.appendChild(loadingDiv);
        
        try {
            // Fetch products directly from API
            const response = await fetch('/api/category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: searchTerm,
                    search: searchTerm,
                    term: searchTerm,
                    limit: 50,
                    sort: 'trending',
                    trending_range: 30
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.products || data.products.length === 0) {
                throw new Error('No products found for this search term');
            }
            
            // Store product data in global variables
            window.globalProductData = data.products;
            window.globalSearchQuery = searchTerm;
            
            // Remove loading overlay
            loadingDiv.remove();
            
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'success-notification';
            successDiv.innerHTML = `
                <div class="success-content">
                    <i class="fas fa-check-circle"></i>
                    <p>Successfully loaded ${data.products.length} products for analysis!</p>
                </div>
            `;
            successDiv.style = 'position: fixed; top: 20px; right: 20px; background: rgba(40, 167, 69, 0.9); color: white; padding: 15px; border-radius: 5px; z-index: 9999; box-shadow: 0 4px 8px rgba(0,0,0,0.2);';
            document.body.appendChild(successDiv);
            
            // Remove notification after 3 seconds
            setTimeout(() => successDiv.remove(), 3000);
            
            // Add product preview
            addProductPreview(data.products);
            
            return data.products;
            
        } catch (error) {
            // Remove loading overlay
            loadingDiv.remove();
            
            // Show error message
            alert(`Error fetching products: ${error.message}`);
            throw error;
        }
    }
    
    // Add product preview
    function addProductPreview(products) {
        // Create container for preview if it doesn't exist
        let previewContainer = document.getElementById('product-preview-container');
        
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.id = 'product-preview-container';
            previewContainer.className = 'product-preview-container';
            previewContainer.style = 'margin-top: 15px; background: rgba(26, 26, 26, 0.8); border-radius: 5px; padding: 15px; border: 1px solid rgba(70, 70, 70, 0.5);';
            
            // Insert after the fetch button
            const aiContainer = document.querySelector('.ai-analysis-container');
            if (aiContainer) {
                aiContainer.insertBefore(previewContainer, aiContainer.children[1]);
            }
        }
        
        // Clear previous content
        previewContainer.innerHTML = '';
        
        // Add header
        const header = document.createElement('div');
        header.className = 'preview-header';
        header.innerHTML = `<h4><i class="fas fa-shopping-basket"></i> Loaded Products (${products.length})</h4>`;
        previewContainer.appendChild(header);
        
        // Add product preview list
        const previewList = document.createElement('div');
        previewList.className = 'preview-list';
        previewList.style = 'max-height: 200px; overflow-y: auto; margin-top: 10px;';
        
        // Add first 10 products
        const displayProducts = products.slice(0, 10);
        displayProducts.forEach((product, index) => {
            const productItem = document.createElement('div');
            productItem.className = 'preview-item';
            productItem.style = 'display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(70, 70, 70, 0.3);';
            
            productItem.innerHTML = `
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${index + 1}. ${product.title || 'Unknown Product'}</span>
                <span>${product.price || 'N/A'}</span>
            `;
            
            previewList.appendChild(productItem);
        });
        
        // Add message about more products if needed
        if (products.length > 10) {
            const moreProducts = document.createElement('div');
            moreProducts.className = 'more-products';
            moreProducts.style = 'text-align: center; padding: 5px; font-style: italic; color: rgba(255, 255, 255, 0.7);';
            moreProducts.innerText = `... and ${products.length - 10} more products`;
            previewList.appendChild(moreProducts);
        }
        
        previewContainer.appendChild(previewList);
    }
    
    // Check if we need to inject CSS
    if (!document.getElementById('direct-fetch-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'direct-fetch-styles';
        styleSheet.innerHTML = `
            .loading-indicator {
                display: inline-block;
                width: 40px;
                height: 40px;
                border: 3px solid rgba(70, 70, 70, 0.3);
                border-radius: 50%;
                border-top: 3px solid #01C4C8;
                animation: spin 1s linear infinite;
                margin-bottom: 1rem;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .preview-header h4 {
                margin: 0;
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .preview-header h4 i {
                color: #01C4C8;
                margin-right: 8px;
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    // Connect with existing LLM analysis
    // This ensures our direct fetch integrates with the existing LLM analysis
    const analyzeBtn = document.getElementById('analyzeDataBtn');
    const structuredBtn = document.getElementById('structuredAnalysisBtn');
    const askBtn = document.getElementById('askQuestionBtn');
    
    if (analyzeBtn) {
        const originalClick = analyzeBtn.onclick;
        analyzeBtn.onclick = async function(e) {
            if (!window.globalProductData || window.globalProductData.length === 0) {
                try {
                    await fetchProductsDirectly();
                } catch (error) {
                    return; // Stop if fetch fails
                }
            }
            
            if (originalClick) originalClick.call(this, e);
        };
    }
    
    if (structuredBtn) {
        const originalClick = structuredBtn.onclick;
        structuredBtn.onclick = async function(e) {
            if (!window.globalProductData || window.globalProductData.length === 0) {
                try {
                    await fetchProductsDirectly();
                } catch (error) {
                    return; // Stop if fetch fails
                }
            }
            
            if (originalClick) originalClick.call(this, e);
        };
    }
    
    if (askBtn) {
        const originalClick = askBtn.onclick;
        askBtn.onclick = async function(e) {
            if (!window.globalProductData || window.globalProductData.length === 0) {
                try {
                    await fetchProductsDirectly();
                } catch (error) {
                    return; // Stop if fetch fails
                }
            }
            
            if (originalClick) originalClick.call(this, e);
        };
    }
    
    // Add global debug function
    window.showProductData = function() {
        if (!window.globalProductData || window.globalProductData.length === 0) {
            alert('No product data available. Use the "Fetch Products for Analysis" button to load products.');
            return;
        }
        
        console.log('Current product data:', window.globalProductData);
        alert(`Currently loaded: ${window.globalProductData.length} products for query: "${window.globalSearchQuery}"`);
    };
});