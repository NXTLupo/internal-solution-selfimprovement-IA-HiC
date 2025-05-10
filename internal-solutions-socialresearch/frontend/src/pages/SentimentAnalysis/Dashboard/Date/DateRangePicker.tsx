import React, { useState, useEffect } from 'react';
import './datapicker-custome.css';
import { useDispatch, useSelector } from 'react-redux';
import { setDateFilteredData } from '../../../../store/sentimentAnalysisSlice';
import { RootState } from '../../../../store/store';
import { AnalysisData, Post, Category, Point } from '../../../../types/analysis';

interface DateRangePickerProps {
  onChange: (dates: { 
    fromYear: string | null;
    fromMonth: string | null;
    toYear: string | null;
    toMonth: string | null;
  }) => void;
  maxDate?: string; // Format: "YYYY-MM-DD" or Unix timestamp
}

interface DateRange {
  fromYear: string | null;
  fromMonth: string | null;
  toYear: string | null;
  toMonth: string | null;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange, maxDate }) => {
  const dispatch = useDispatch();
  const { data } = useSelector((state: RootState) => state.sentimentAnalysis);
  
  // Get the latest date either from maxDate prop or current date
  const getMaxDate = () => {
    if (maxDate) {
      try {
        // Check if it's a numeric string (Unix timestamp)
        if (/^\d+$/.test(maxDate)) {
          const timestamp = parseInt(maxDate);
          // If it's in seconds (10 digits), convert to milliseconds
          const milliseconds = timestamp > 10000000000 ? timestamp : timestamp * 1000;
          const date = new Date(milliseconds);
          if (!isNaN(date.getTime())) {
            return {
              year: date.getFullYear().toString(),
              month: String(date.getMonth() + 1).padStart(2, '0')
            };
          }
        }
        
        // Try standard date parsing
        const date = new Date(maxDate);
        if (!isNaN(date.getTime())) {
          return {
            year: date.getFullYear().toString(),
            month: String(date.getMonth() + 1).padStart(2, '0')
          };
        }
      } catch (e) {
        console.error("Error parsing maxDate:", maxDate, e);
      }
    }
    
    // Default to current date
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0')
    };
  };

  // Calculate max date once
  const maxDateValues = getMaxDate();
  const maxYear = maxDateValues.year;
  const maxMonth = maxDateValues.month;

  // Set initial state with calculated values
  const [fromYear, setFromYear] = useState<string | null>(null);
  const [fromMonth, setFromMonth] = useState<string | null>(null);
  const [toYear, setToYear] = useState<string | null>(maxYear);
  const [toMonth, setToMonth] = useState<string | null>(maxMonth);

  // Generate years from 2015 to max year
  const years = Array.from(
    { length: parseInt(maxYear) - 2014 }, 
    (_, i) => String(2015 + i)
  );

  const months = [
    { value: '01', label: 'JAN' },
    { value: '02', label: 'FEB' },
    { value: '03', label: 'MAR' },
    { value: '04', label: 'APR' },
    { value: '05', label: 'MAY' },
    { value: '06', label: 'JUN' },
    { value: '07', label: 'JUL' },
    { value: '08', label: 'AUG' },
    { value: '09', label: 'SEP' },
    { value: '10', label: 'OCT' },
    { value: '11', label: 'NOV' },
    { value: '12', label: 'DEC' }
  ];

  // Call onChange with initial values once on mount and when max date changes
  useEffect(() => {
    // Set state with new max values if they change
    setToYear(maxYear);
    setToMonth(maxMonth);
    
    // Notify parent component of initial values
    onChange({
      fromYear: null,
      fromMonth: null,
      toYear: maxYear,
      toMonth: maxMonth,
    });
  }, [maxYear, maxMonth, onChange]);

  const handleChange = (type: 'fromYear' | 'fromMonth' | 'toYear' | 'toMonth', value: string | null) => {
    switch (type) {
      case 'fromYear':
        setFromYear(value);
        if (!value) setFromMonth(null);
        break;
      case 'fromMonth':
        setFromMonth(value);
        break;
      case 'toYear':
        setToYear(value);
        if (!value) setToMonth(null);
        break;
      case 'toMonth':
        setToMonth(value);
        break;
    }

    const newDateRange = {
      fromYear: type === 'fromYear' ? value : fromYear,
      fromMonth: type === 'fromMonth' ? value : fromMonth,
      toYear: type === 'toYear' ? value : toYear,
      toMonth: type === 'toMonth' ? value : toMonth,
    };
    
    onChange(newDateRange);
    
    // Filter data based on date range and update Redux
    if (data) {
      const filteredData = filterDataByDateRange(data, newDateRange);
      console.log("Date filter applied:", newDateRange);
      console.log("Filtered data items:", filteredData);
      dispatch(setDateFilteredData(filteredData));
    }
  };

  // Function to filter data based on date range
  const filterDataByDateRange = (data: AnalysisData, dateRange: DateRange): AnalysisData => {
    // If no date range is selected or it's the default (max date), return all data
    if (!data || (!dateRange.fromYear && dateRange.toYear === maxYear && dateRange.toMonth === maxMonth)) {
      return data;
    }

    console.log("Data structure type:", typeof data, Array.isArray(data) ? "array" : "not array");
    
    // Check if data has formatted_data and merged_result (common structure in the app)
    if (data.formatted_data && data.merged_result) {
      console.log("Found formatted_data and merged_result structure");
      
      // Create a deep copy of the data to avoid mutating the original
      const filteredData = JSON.parse(JSON.stringify(data)) as AnalysisData;
      
      // Get the posts that are within the date range
      const postsWithinRange = new Set<string>();
      
      if (filteredData.formatted_data.results && Array.isArray(filteredData.formatted_data.results)) {
        filteredData.formatted_data.results.forEach((post: Post) => {
          if (isPostWithinDateRange(post, dateRange)) {
            // Store the post ID in the set if it's within range
            postsWithinRange.add(`post${post.id}`);
            postsWithinRange.add(`post ${post.id}`);
          }
        });
      }
      
      console.log(`Found ${postsWithinRange.size} posts within date range`);
      
      // Filter the merged_result data based on the posts within range
      ['positive', 'negative'].forEach(sentiment => {
        if (filteredData.merged_result[sentiment as 'positive' | 'negative'] && 
            Array.isArray(filteredData.merged_result[sentiment as 'positive' | 'negative'])) {
          filteredData.merged_result[sentiment as 'positive' | 'negative'] = filteredData.merged_result[sentiment as 'positive' | 'negative']
            .map((category: Category) => ({
              ...category,
              points: category.points
                .map((point: Point) => ({
                  ...point,
                  evidence: Object.fromEntries(
                    Object.entries(point.evidence).filter(([postId]) => postsWithinRange.has(postId))
                  )
                }))
                .filter((point: Point) => Object.keys(point.evidence).length > 0)
            }))
            .filter((category: Category) => category.points.length > 0);
        }
      });
      
      return filteredData;
    }
    
    // For other data structures, return as is
    console.log("Unknown data structure, returning original data");
    return data;
  };

  // Helper function to check if a post is within date range (similar to AnalysisTab)
  const isPostWithinDateRange = (post: Post, dateRange: DateRange): boolean => {
    const postDate = getDateFromTimestamp(post.created_utc);
    if (!postDate) return true; // If can't parse date, include it

    // If no date range is set, show all posts
    if (!dateRange?.fromYear && !dateRange?.toYear) return true;

    // Check if post is within the date range
    let fromDate = null;
    if (dateRange.fromYear && dateRange.fromMonth) {
      fromDate = new Date(parseInt(dateRange.fromYear), parseInt(dateRange.fromMonth) - 1, 1);
      fromDate.setHours(0, 0, 0, 0); // Start of day
    }
    
    let toDate = null;
    if (dateRange.toYear && dateRange.toMonth) {
      // Get last day of month
      const lastDay = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth), 0).getDate();
      toDate = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth) - 1, lastDay);
      toDate.setHours(23, 59, 59, 999); // End of day
    }

    if (fromDate && toDate) {
      return postDate >= fromDate && postDate <= toDate;
    } else if (fromDate) {
      return postDate >= fromDate;
    } else if (toDate) {
      return postDate <= toDate;
    }

    return true;
  };

  // Helper function to convert timestamp to Date object (copied from AnalysisTab)
  const getDateFromTimestamp = (timestamp: string): Date | null => {
    try {
      // Check if it's a numeric string (likely a Unix timestamp)
      if (/^\d+$/.test(timestamp)) {
        const timestampNum = parseInt(timestamp);
        // Convert seconds to milliseconds if needed
        const milliseconds = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
        const date = new Date(milliseconds);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Try standard date parsing as fallback
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) ? date : null;
    } catch (e) {
      console.error("Failed to parse date:", timestamp, e);
      return null;
    }
  };

  // Validate date range
  // const validateDateRange = (year: string, month: string) => {
  //   const date = new Date(`${year}-${month}-01`);
  //   const maxDate = new Date(`${maxYear}-${maxMonth}-01`);
  //   return date <= maxDate;
  // };

  return (
    <div className="flex items-center gap-4 p-3 bg-[#1F2937] rounded-lg border border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">From:</span>
        <select
          value={fromYear || ''}
          onChange={(e) => handleChange('fromYear', e.target.value || null)}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Year</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={fromMonth || ''}
          onChange={(e) => handleChange('fromMonth', e.target.value || null)}
          disabled={!fromYear}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        >
          <option value="">Month</option>
          {months.map(month => (
            <option 
              key={month.value} 
              value={month.value}
              disabled={fromYear === maxYear && parseInt(month.value) > parseInt(maxMonth)}
            >
              {month.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">To:</span>
        <select
          value={toYear || ''}
          onChange={(e) => handleChange('toYear', e.target.value || null)}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Year</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={toMonth || ''}
          onChange={(e) => handleChange('toMonth', e.target.value || null)}
          disabled={!toYear}
          className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
        >
          <option value="">Month</option>
          {months.map(month => (
            <option 
              key={month.value} 
              value={month.value}
              disabled={toYear === maxYear && parseInt(month.value) > parseInt(maxMonth)}
            >
              {month.label}
            </option>
          ))}
        </select>
      </div>

      {(fromYear || toYear !== maxYear || toMonth !== maxMonth) && (
        <button
          onClick={() => {
            setFromYear(null);
            setFromMonth(null);
            setToYear(maxYear);
            setToMonth(maxMonth);
            const resetDateRange = {
              fromYear: null,
              fromMonth: null,
              toYear: maxYear,
              toMonth: maxMonth,
            };
            onChange(resetDateRange);
            
            // Reset filtered data to original data
            if (data) {
              console.log("Date filters cleared, resetting to original data");
              dispatch(setDateFilteredData(data));
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
};