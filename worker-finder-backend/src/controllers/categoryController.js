const { promisePool } = require('../config/database');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const [categories] = await promisePool.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name ASC'
    );
    
    // Get worker count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const [count] = await promisePool.query(
          `SELECT COUNT(*) as worker_count 
           FROM worker_profiles wp
           JOIN users u ON wp.user_id = u.id
           WHERE wp.profession LIKE ? AND u.is_active = TRUE`,
          [`%${category.name}%`]
        );
        
        return {
          ...category,
          worker_count: count[0].worker_count
        };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCount
    });
    
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const [categories] = await promisePool.query(
      'SELECT * FROM categories WHERE id = ? AND is_active = TRUE',
      [categoryId]
    );
    
    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get workers in this category
    const [workers] = await promisePool.query(
      `SELECT 
        wp.*,
        u.email,
        u.mobile,
        u.is_verified
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.id
      WHERE wp.profession LIKE ? AND u.is_active = TRUE
      ORDER BY wp.average_rating DESC, wp.total_jobs_completed DESC
      LIMIT 20`,
      [`%${categories[0].name}%`]
    );
    
    res.json({
      success: true,
      data: {
        category: categories[0],
        workers
      }
    });
    
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

// Get popular categories (most workers)
const getPopularCategories = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [categories] = await promisePool.query(
      `SELECT 
        c.*,
        COUNT(wp.id) as worker_count
      FROM categories c
      LEFT JOIN worker_profiles wp ON wp.profession LIKE CONCAT('%', c.name, '%')
      LEFT JOIN users u ON wp.user_id = u.id
      WHERE c.is_active = TRUE AND (u.is_active = TRUE OR u.id IS NULL)
      GROUP BY c.id
      ORDER BY worker_count DESC
      LIMIT ?`,
      [parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: categories
    });
    
  } catch (error) {
    console.error('Get popular categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular categories'
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getPopularCategories
};
