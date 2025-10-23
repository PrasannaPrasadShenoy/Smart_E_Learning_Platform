const { computeCLI, analyzeCLITrends } = require('../utils/computeCLI');
const Assessment = require('../models/Assessment');

class CLIService {
  /**
   * Process cognitive metrics and compute CLI
   * @param {Array} metrics - Array of cognitive metrics
   * @param {Object} assessmentData - Assessment data
   * @returns {Object} CLI computation result
   */
  async processMetrics(metrics, assessmentData) {
    try {
      // Handle case where no metrics are provided (fallback to default values)
      if (!metrics || metrics.length === 0) {
        console.log('No cognitive metrics provided, using default values');
        const defaultMetrics = {
          avgOnScreen: 85,
          blinkRatePerMin: 15,
          headMovement: 0,
          eyeGazeStability: 85
        };
        
        const cliResult = computeCLI({
          focusPct: defaultMetrics.avgOnScreen,
          blinkRate: defaultMetrics.blinkRatePerMin,
          timeSpent: assessmentData.timeSpent || 30,
          metrics: defaultMetrics,
          averageTime: 30
        });

        return {
          ...cliResult,
          avgMetrics: defaultMetrics,
          totalMetrics: 0,
          processingTime: new Date().toISOString()
        };
      }

      // Calculate average metrics
      const avgMetrics = this.calculateAverageMetrics(metrics);
      
      // Compute CLI
      const cliResult = computeCLI({
        focusPct: avgMetrics.avgOnScreen,
        blinkRate: avgMetrics.blinkRatePerMin,
        timeSpent: assessmentData.timeSpent || 30,
        metrics: avgMetrics,
        averageTime: 30 // Default average time
      });

      return {
        ...cliResult,
        avgMetrics,
        totalMetrics: metrics.length,
        processingTime: new Date().toISOString()
      };

    } catch (error) {
      console.error('CLI processing error:', error.message);
      console.error('Error details:', error);
      
      // Return default CLI values instead of throwing error
      console.log('Returning default CLI values due to processing error');
      const defaultMetrics = {
        avgOnScreen: 85,
        blinkRatePerMin: 15,
        headMovement: 0,
        eyeGazeStability: 85
      };
      
      const cliResult = computeCLI({
        focusPct: defaultMetrics.avgOnScreen,
        blinkRate: defaultMetrics.blinkRatePerMin,
        timeSpent: assessmentData.timeSpent || 30,
        metrics: defaultMetrics,
        averageTime: 30
      });

      return {
        ...cliResult,
        avgMetrics: defaultMetrics,
        totalMetrics: 0,
        processingTime: new Date().toISOString(),
        error: 'Used default values due to processing error'
      };
    }
  }

  /**
   * Calculate average metrics from raw data
   * @param {Array} metrics - Raw metrics array
   * @returns {Object} Average metrics
   */
  calculateAverageMetrics(metrics) {
    if (metrics.length === 0) {
      return {
        avgOnScreen: 85,
        blinkRatePerMin: 15,
        headMovement: 0,
        eyeGazeStability: 85
      };
    }

    const totals = metrics.reduce((acc, metric) => ({
      avgOnScreen: acc.avgOnScreen + (metric.avgOnScreen || 0),
      blinkRatePerMin: acc.blinkRatePerMin + (metric.blinkRatePerMin || 0),
      headMovement: acc.headMovement + (metric.headMovement || 0),
      eyeGazeStability: acc.eyeGazeStability + (metric.eyeGazeStability || 0)
    }), { avgOnScreen: 0, blinkRatePerMin: 0, headMovement: 0, eyeGazeStability: 0 });

    const count = metrics.length;
    return {
      avgOnScreen: Math.round((totals.avgOnScreen / count) * 100) / 100,
      blinkRatePerMin: Math.round((totals.blinkRatePerMin / count) * 100) / 100,
      headMovement: Math.round((totals.headMovement / count) * 100) / 100,
      eyeGazeStability: Math.round((totals.eyeGazeStability / count) * 100) / 100
    };
  }

  /**
   * Analyze cognitive load trends for a user
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID (optional)
   * @param {number} limit - Number of recent assessments to analyze
   * @returns {Promise<Object>} Trend analysis
   */
  async analyzeUserTrends(userId, courseId = null, limit = 10) {
    try {
      const query = { userId, status: 'completed' };
      if (courseId) {
        query.courseId = courseId;
      }

      const assessments = await Assessment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('cli testScore createdAt courseId');

      return analyzeCLITrends(assessments);

    } catch (error) {
      console.error('Trend analysis error:', error.message);
      return {
        trend: 'error',
        averageCLI: 0,
        improvement: 0,
        recommendations: ['Unable to analyze trends at this time']
      };
    }
  }

  /**
   * Get cognitive load insights for dashboard
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cognitive insights
   */
  async getUserInsights(userId) {
    try {
      const recentAssessments = await Assessment.find({
        userId,
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('cli cliClassification testScore createdAt courseId');

      if (recentAssessments.length === 0) {
        return {
          message: 'No assessment data available',
          insights: []
        };
      }

      // Calculate insights
      const insights = this.generateInsights(recentAssessments);
      
      return {
        totalAssessments: recentAssessments.length,
        insights,
        trends: await this.analyzeUserTrends(userId)
      };

    } catch (error) {
      console.error('User insights error:', error.message);
      return {
        message: 'Unable to generate insights',
        insights: []
      };
    }
  }

  /**
   * Generate insights from assessment data
   * @param {Array} assessments - Assessment data
   * @returns {Array} Generated insights
   */
  generateInsights(assessments) {
    const insights = [];
    
    // Average CLI
    const avgCLI = assessments.reduce((sum, a) => sum + a.cli, 0) / assessments.length;
    insights.push({
      type: 'average_cli',
      value: Math.round(avgCLI * 100) / 100,
      message: `Your average cognitive load is ${Math.round(avgCLI)}`
    });

    // Load distribution
    const loadDistribution = assessments.reduce((acc, a) => {
      acc[a.cliClassification] = (acc[a.cliClassification] || 0) + 1;
      return acc;
    }, {});

    const dominantLoad = Object.entries(loadDistribution)
      .sort(([,a], [,b]) => b - a)[0];

    if (dominantLoad) {
      insights.push({
        type: 'dominant_load',
        value: dominantLoad[0],
        message: `You typically experience ${dominantLoad[0].toLowerCase()}`
      });
    }

    // Performance correlation
    const highCLI = assessments.filter(a => a.cli > 70);
    const highCLIPerformance = highCLI.reduce((sum, a) => sum + a.testScore, 0) / highCLI.length;
    
    if (highCLI.length > 0) {
      insights.push({
        type: 'performance_under_load',
        value: Math.round(highCLIPerformance),
        message: `Your performance under high cognitive load: ${Math.round(highCLIPerformance)}%`
      });
    }

    // Improvement trend
    if (assessments.length >= 3) {
      const recent = assessments.slice(0, 3);
      const older = assessments.slice(-3);
      
      const recentAvg = recent.reduce((sum, a) => sum + a.cli, 0) / recent.length;
      const olderAvg = older.reduce((sum, a) => sum + a.cli, 0) / older.length;
      
      const improvement = olderAvg - recentAvg;
      
      if (Math.abs(improvement) > 5) {
        insights.push({
          type: 'improvement_trend',
          value: Math.round(improvement * 100) / 100,
          message: improvement > 0 
            ? `Your cognitive load has decreased by ${Math.round(improvement)} points`
            : `Your cognitive load has increased by ${Math.round(Math.abs(improvement))} points`
        });
      }
    }

    return insights;
  }

  /**
   * Validate cognitive metrics
   * @param {Object} metrics - Metrics to validate
   * @returns {Object} Validation result
   */
  validateMetrics(metrics) {
    const errors = [];

    if (!metrics.avgOnScreen || metrics.avgOnScreen < 0 || metrics.avgOnScreen > 100) {
      errors.push('avgOnScreen must be between 0 and 100');
    }

    if (!metrics.blinkRatePerMin || metrics.blinkRatePerMin < 0) {
      errors.push('blinkRatePerMin must be a positive number');
    }

    if (metrics.headMovement !== undefined && (metrics.headMovement < 0 || metrics.headMovement > 100)) {
      errors.push('headMovement must be between 0 and 100');
    }

    if (metrics.eyeGazeStability !== undefined && (metrics.eyeGazeStability < 0 || metrics.eyeGazeStability > 100)) {
      errors.push('eyeGazeStability must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get optimal learning recommendations based on CLI
   * @param {number} cli - Cognitive Load Index
   * @param {string} classification - CLI classification
   * @returns {Array} Recommendations
   */
  getLearningRecommendations(cli, classification) {
    const recommendations = [];

    switch (classification) {
      case 'Low Load':
        recommendations.push('You can handle more challenging content');
        recommendations.push('Consider increasing learning pace');
        recommendations.push('Try advanced topics in this subject');
        break;
        
      case 'Moderate Load':
        recommendations.push('Current learning pace is optimal');
        recommendations.push('Continue with similar difficulty content');
        recommendations.push('Take short breaks between sessions');
        break;
        
      case 'High Load':
        recommendations.push('Consider reducing content complexity');
        recommendations.push('Take more frequent breaks');
        recommendations.push('Review foundational concepts');
        recommendations.push('Try shorter learning sessions');
        break;
    }

    return recommendations;
  }
}

module.exports = new CLIService();
