/**
 * filterFunctions.js — Glamborrow Enhanced Filter
 * 
 * USAGE: Import and call initFilter(products, renderProductsFn) in glamborow.js
 * 
 * The filter panel is built into index.html (.js-pop).
 * Call initFilter() AFTER products are rendered to wire it up.
 * 
 * Size data is pulled from product.size array if available.
 */

// Sizes to show for wearable categories
const SIZE_CATEGORIES = ['dress', 'suit', 'gown', 'outfit', 'clothing', 'shoes', 'heels', 'boots', 'sneakers', 'frontal', 'wig', 'jumpsuit', 'pants', 'skirt', 'top', 'jacket'];

const ALL_SIZES = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'],
  shoes: ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
  general: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '4', '5', '6', '7', '8', '9', '10']
};

function getCategoryType(cat) {
  const shoeWords = ['shoes', 'heels', 'boots', 'sneakers', 'sandals', 'pumps'];
  const clothingWords = ['dress', 'gown', 'suit', 'outfit', 'jumpsuit', 'pants', 'skirt', 'top', 'jacket', 'clothing'];
  const lower = cat.toLowerCase();

  if (shoeWords.some(w => lower.includes(w))) return 'shoes';
  if (clothingWords.some(w => lower.includes(w))) return 'clothing';
  return 'general';
}

function needsSizeFilter(category) {
  const lower = category.toLowerCase();
  return SIZE_CATEGORIES.some(s => lower.includes(s));
}

export function initFilter(products, renderProducts) {
  const filterBtn = document.querySelector('.js-filterbutton');
  const filterPop = document.querySelector('.js-pop');
  const filterOverlay = document.querySelector('.js-filter-overlay');
  const categoryContainer = document.querySelector('.js-category-buttons');
  const sizeSection = document.querySelector('.js-size-section');
  const sizeChipsContainer = document.querySelector('.js-size-chips');
  const applyBtn = document.querySelector('.js-applyfilter');
  const clearBtn = document.querySelector('.js-clearfilter');

  if (!filterBtn || !filterPop) return;

  // Build category list from products
  const categories = [...new Set(products.map(p => p.type || p.category).filter(Boolean))];

  let selectedCategory = null;
  let selectedSize = null;

  // Render category buttons
  function buildCategoryButtons() {
    if (!categoryContainer) return;
    categoryContainer.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'producttypebutton';
      btn.textContent = cat;
      if (cat === selectedCategory) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        selectedCategory = selectedCategory === cat ? null : cat;
        selectedSize = null;
        buildCategoryButtons();
        buildSizeChips();
      });
      categoryContainer.appendChild(btn);
    });
  }

  // Render size chips based on selected category
  function buildSizeChips() {
    if (!sizeSection || !sizeChipsContainer) return;

    if (!selectedCategory || !needsSizeFilter(selectedCategory)) {
      sizeSection.style.display = 'none';
      return;
    }

    // Try to get sizes from actual products in this category
    const catProducts = products.filter(p => (p.type || p.category) === selectedCategory);
    let sizes = [];
    catProducts.forEach(p => {
      if (p.size && Array.isArray(p.size)) {
        p.size.forEach(s => { if (!sizes.includes(s)) sizes.push(s); });
      }
    });

    // Fall back to predefined sizes
    if (sizes.length === 0) {
      const catType = getCategoryType(selectedCategory);
      sizes = ALL_SIZES[catType] || ALL_SIZES.general;
    }

    sizeChipsContainer.innerHTML = '';
    sizes.forEach(size => {
      const chip = document.createElement('button');
      chip.className = 'size-chip';
      chip.textContent = size;
      if (size === selectedSize) chip.classList.add('selected');
      chip.addEventListener('click', () => {
        selectedSize = selectedSize === size ? null : size;
        buildSizeChips();
      });
      sizeChipsContainer.appendChild(chip);
    });

    sizeSection.style.display = 'block';
  }

  // Toggle filter panel
  function openFilter() {
    buildCategoryButtons();
    buildSizeChips();
    filterPop.style.display = 'block';
    if (filterOverlay) filterOverlay.classList.add('open');
  }

  function closeFilter() {
    filterPop.style.display = 'none';
    if (filterOverlay) filterOverlay.classList.remove('open');
  }

  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterPop.style.display === 'none' ? openFilter() : closeFilter();
  });

  filterOverlay?.addEventListener('click', closeFilter);

  // Apply filter
  applyBtn?.addEventListener('click', () => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter(p => (p.type || p.category) === selectedCategory);
    }

    if (selectedSize) {
      filtered = filtered.filter(p =>
        p.size && Array.isArray(p.size) && p.size.includes(selectedSize)
      );
    }

    renderProducts(filtered);
    closeFilter();
  });

  // Clear filter
  clearBtn?.addEventListener('click', () => {
    selectedCategory = null;
    selectedSize = null;
    buildCategoryButtons();
    buildSizeChips();
    renderProducts(products);
    closeFilter();
  });
}

export function filterByPremium(products) {
  return products.filter(p => p.premium === true || p.budget === false);
}

export function filterByBudget(products) {
  return products.filter(p => p.premium === false || p.budget === true || (p.price && p.price < 500));
}
