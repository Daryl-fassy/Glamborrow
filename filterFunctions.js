// Product filter utility
// Copy and paste this whole block

/**
 * Filters and sorts products.
 * @param {Array<Object>} products - Array of product objects.
 * @param {Object} filters - Filtering criteria.
 *   Supported keys:
 *     - Producttype: string
 *     - minPrice: number
 *     - maxPrice: number
 *     - size: string or Array<string> (e.g., "M" or ["S","M"])
 *     - colour: string or Array<string>
 *     - name: string (case-insensitive substring)
 *     - location: string (exact match or substring)
 *     - rentalStatus: string
 *     - class: string
 * @param {Object} options - Optional behavior
 *   - sortBy: 'price' | 'name' | 'priceDesc' | 'newest' (default null)
 *   - page: number (1-based)
 *   - perPage: number
 * @returns {Object} { results: Array, total: number }
 */
function filterProducts(products = [], filters = {}, options = {}) {
  const {
    Producttype,
    minPrice,
    maxPrice,
    size,
    colour,
    name,
    location,
    rentalStatus,
    class: classFilter
  } = filters || {};

  const {
    sortBy = null,
    page = null,
    perPage = null
  } = options || {};

  // Normalize filter values
  const sizesFilter = Array.isArray(size) ? size.map(s => String(s).toLowerCase()) : (size ? [String(size).toLowerCase()] : null);
  const coloursFilter = Array.isArray(colour) ? colour.map(c => String(c).toLowerCase()) : (colour ? [String(colour).toLowerCase()] : null);
  const nameQuery = name ? String(name).trim().toLowerCase() : null;
  const locationQuery = location ? String(location).trim().toLowerCase() : null;
  const productTypeQuery = Producttype ? String(Producttype).trim().toLowerCase() : null;
  const rentalStatusQuery = rentalStatus ? String(rentalStatus).trim().toLowerCase() : null;
  const classQuery = classFilter ? String(classFilter).trim().toLowerCase() : null;

  // Core filtering
  let matched = products.filter(product => {
    if (!product || typeof product !== 'object') return false;

    // Producttype
    if (productTypeQuery) {
      const pType = product.Producttype ? String(product.Producttype).toLowerCase() : '';
      if (pType !== productTypeQuery) return false;
    }

    // Price range
    if (typeof minPrice === 'number') {
      if (typeof product.price !== 'number' || product.price < minPrice) return false;
    }
    if (typeof maxPrice === 'number') {
      if (typeof product.price !== 'number' || product.price > maxPrice) return false;
    }

    // Size filtering (product.size is expected to be an array)
    if (sizesFilter && sizesFilter.length > 0) {
      const productSizes = Array.isArray(product.size) ? product.size.map(s => String(s).toLowerCase()) : [];
      // Match if any requested size exists in product sizes
      const anySizeMatch = sizesFilter.some(s => productSizes.includes(s));
      if (!anySizeMatch) return false;
    }

    // Colour filtering (album.colour expected to be array)
    if (coloursFilter && coloursFilter.length > 0) {
      const productColours = product.album && Array.isArray(product.album.colour) ? product.album.colour.map(c => String(c).toLowerCase()) : [];
      const anyColourMatch = coloursFilter.some(c => productColours.includes(c));
      if (!anyColourMatch) return false;
    }

    // Name search (substring, case-insensitive)
    if (nameQuery) {
      const pName = product.name ? String(product.name).toLowerCase() : '';
      if (!pName.includes(nameQuery)) return false;
    }

    // Location (substring match)
    if (locationQuery) {
      const pLocation = product.location ? String(product.location).toLowerCase() : '';
      if (!pLocation.includes(locationQuery)) return false;
    }

    // Rental status
    if (rentalStatusQuery) {
      const pStatus = product.rentalStatus ? String(product.rentalStatus).toLowerCase() : '';
      if (pStatus !== rentalStatusQuery) return false;
    }

    // Class
    if (classQuery) {
      const pClass = product.class ? String(product.class).toLowerCase() : '';
      if (pClass !== classQuery) return false;
    }

    return true;
  });

  // Sorting
  if (sortBy) {
    if (sortBy === 'price') {
      matched.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'priceDesc') {
      matched.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'name') {
      matched.sort((a, b) => {
        const A = (a.name || '').toLowerCase();
        const B = (b.name || '').toLowerCase();
        return A < B ? -1 : A > B ? 1 : 0;
      });
    } else if (sortBy === 'newest') {
      // If you have a createdAt or id-based ordering, adapt here.
      matched.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
  }

  const total = matched.length;

  // Pagination
  let results = matched;
  if (Number.isInteger(page) && Number.isInteger(perPage) && page > 0 && perPage > 0) {
    const start = (page - 1) * perPage;
    results = matched.slice(start, start + perPage);
  }

  return { results, total };
}

/* ---------------------------
   Example products and usage
   --------------------------- */

// Example product array including the product you provided
const allProducts = [
  {
    id: '1',
    image: "iteams/img2.avif",
    name: "Elegant Dress",
    Producttype: 'dress',
    price: 900,
    album: {
      pictures: [],
      colour: ['black', 'navy']
    },
    description: "This elegant dress is a timeless piece...",
    size: ["XS"],
    class: "Budget",
    location: "https://www.woolworths.co.za",
    rentalStatus: "available"
  },
  {
    id: '2',
    image: "items/img3.avif",
    name: "Summer Gown",
    Producttype: 'dress',
    price: 1200,
    album: { pictures: [], colour: ['red'] },
    description: "Lightweight summer gown",
    size: ["S", "M"],
    class: "Premium",
    location: "https://example.com",
    rentalStatus: "rented"
  },
  // add more products...
];

// Example 1 single size filter
const filters1 = { Producttype: 'dress', size: 'XS' };
const out1 = filterProducts(allProducts, filters1);
console.log('Example 1', out1);

// Example 2 multiple sizes and price range with pagination and sorting
const filters2 = { Producttype: 'dress', size: ['S', 'M'], minPrice: 500, maxPrice: 1500 };
const options2 = { sortBy: 'price', page: 1, perPage: 10 };
const out2 = filterProducts(allProducts, filters2, options2);
console.log('Example 2', out2);

// Example 3 colour and name search
const filters3 = { colour: 'red', name: 'gown' };
const out3 = filterProducts(allProducts, filters3);
console.log('Example 3', out3);
