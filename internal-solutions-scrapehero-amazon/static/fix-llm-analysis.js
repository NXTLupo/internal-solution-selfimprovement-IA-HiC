/**
 * Fix for LLM analysis integration
 * This script adds debug logging and fixes the issue with globalProductData not being populated correctly.
 * 
 * Usage: Include this script after the main JavaScript in index.html
 */

// Add debug button to show current globalProductData state
document.addEventListener('DOMContentLoaded', function() {
    // Add a debug button to the AI analysis section
    const aiActions = document.querySelector('.ai-actions');
    if (aiActions) {
        const debugBtn = document.createElement('button');
        debugBtn.className = 'btn btn-secondary';
        debugBtn.innerHTML = '<i class="fas fa-bug"></i> Debug Data';
        debugBtn.style.marginLeft = '10px';
        debugBtn.onclick = function() {
            console.log('Current global product data:', globalProductData);
            console.log('Current global search query:', globalSearchQuery);
            alert(`Data status: ${globalProductData.length} products stored for query: "${globalSearchQuery}"`);
        };
        aiActions.appendChild(debugBtn);
    }
    
    // Fix product data storage for category searches
    const originalCategoryHandler = document.querySelector('#category-tab .search-controls .btn-primary').onclick;
    document.querySelector('#category-tab .search-controls .btn-primary').onclick = async function(e) {
        e.preventDefault();
        
        const searchInput = document.getElementById('categoryUrl').value;
        console.log('Category search initiated for:', searchInput);
        
        // Call original handler
        if (originalCategoryHandler) {
            await originalCategoryHandler.call(this, e);
        }
        
        // Wait a bit for the products to render
        setTimeout(() => {
            // Look for product cards in the category tab
            const productCards = document.querySelectorAll('#category-tab .product-card');
            console.log('Found', productCards.length, 'product cards in category tab');
            
            if (productCards.length > 0) {
                // Extract product data
                globalProductData = Array.from(productCards).map((card, index) => {
                    const title = card.querySelector('.product-title')?.textContent || 'Unknown Product';
                    const price = card.querySelector('.product-metric:nth-child(1) span')?.textContent || 'N/A';
                    const rating = card.querySelector('.product-rating-value')?.textContent || 'N/A';
                    const reviewCount = card.querySelector('.product-rating-count')?.textContent || '(0 reviews)';
                    
                    let asin = 'N/A';
                    const asinElement = card.querySelector('.product-metric:nth-child(2) span');
                    if (asinElement && asinElement.textContent.includes('ASIN')) {
                        asin = asinElement.textContent.replace('ASIN:', '').trim();
                    }
                    
                    const trendingElement = card.querySelector('.trending-metric span');
                    const trendingScore = trendingElement ? trendingElement.textContent.replace('Trending:', '').trim() : 'N/A';
                    
                    const trendingRank = card.querySelector('.sentiment-label')?.textContent.includes('Trending Rank') ?
                        card.querySelector('.sentiment-label').textContent.replace('Trending Rank:', '').replace('#', '').trim() :
                        'N/A';
                    
                    return {
                        title,
                        price,
                        rating: isNaN(parseFloat(rating)) ? 'N/A' : parseFloat(rating),
                        review_count: parseInt(reviewCount.replace(/[^0-9]/g, '')) || 0,
                        asin,
                        trending_score: trendingScore,
                        trending_rank: trendingRank
                    };
                });
                
                // Store the search query
                globalSearchQuery = searchInput;
                console.log('✓ Stored', globalProductData.length, 'products for LLM analysis from category search');
                
                // Show a notification to the user
                const notification = document.createElement('div');
                notification.className = 'alert alert-success';
                notification.style = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 10px; background: rgba(40, 167, 69, 0.8); color: white; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
                notification.innerHTML = `<i class="fas fa-check-circle"></i> ${globalProductData.length} products ready for AI analysis`;
                document.body.appendChild(notification);
                
                // Remove notification after 3 seconds
                setTimeout(() => notification.remove(), 3000);
            }
        }, 1000);
    };
    
    // Add a direct data extraction button
    const aiAnalysisContainer = document.querySelector('.ai-analysis-container');
    if (aiAnalysisContainer) {
        const extractDataBtn = document.createElement('button');
        extractDataBtn.className = 'btn btn-warning';
        extractDataBtn.style = 'margin: 10px 0; display: block; width: 100%;';
        extractDataBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Extract Product Data Now';
        extractDataBtn.onclick = function() {
            // Look for product cards in any container
            const productCards = document.querySelectorAll('.product-card');
            
            if (productCards.length > 0) {
                // Extract product data
                globalProductData = Array.from(productCards).map((card, index) => {
                    const title = card.querySelector('.product-title')?.textContent || 'Unknown Product';
                    const price = card.querySelector('.product-metric:nth-child(1) span')?.textContent || 'N/A';
                    const rating = card.querySelector('.product-rating-value')?.textContent || 'N/A';
                    const reviewCount = card.querySelector('.product-rating-count')?.textContent || '(0 reviews)';
                    
                    let asin = 'N/A';
                    const asinElement = card.querySelector('.product-metric:nth-child(2) span');
                    if (asinElement && asinElement.textContent.includes('ASIN')) {
                        asin = asinElement.textContent.replace('ASIN:', '').trim();
                    }
                    
                    return {
                        title,
                        price,
                        rating: isNaN(parseFloat(rating)) ? 'N/A' : parseFloat(rating),
                        review_count: parseInt(reviewCount.replace(/[^0-9]/g, '')) || 0,
                        asin
                    };
                });
                
                // Get search query from any visible input
                const categoryInput = document.getElementById('categoryUrl');
                const insightsInput = document.getElementById('insightSearch');
                globalSearchQuery = (categoryInput && categoryInput.value) || 
                                     (insightsInput && insightsInput.value) || 
                                     'product search';
                
                alert(`Successfully extracted ${globalProductData.length} products for LLM analysis!`);
                console.log('Extracted product data:', globalProductData);
            } else {
                alert('No product cards found on the page. Please run a search first.');
            }
        };
        
        // Insert the button at the beginning of the container
        aiAnalysisContainer.insertBefore(extractDataBtn, aiAnalysisContainer.firstChild);
    }
});