import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const Program = ({ value, onChange, onValidation }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Complete list of TMU undergraduate programs
  const tmuPrograms = [
    // Faculty of Arts
    { name: "Arts and Contemporary Studies", faculty: "Arts", type: "BA" },
    { name: "Canadian Studies", faculty: "Arts", type: "BA" },
    { name: "Criminology", faculty: "Arts", type: "BA" },
    { name: "Economics", faculty: "Arts", type: "BA" },
    { name: "Economics and Finance", faculty: "Arts", type: "BA" },
    { name: "English", faculty: "Arts", type: "BA" },
    { name: "French", faculty: "Arts", type: "BA" },
    { name: "Geography", faculty: "Arts", type: "BA" },
    { name: "History", faculty: "Arts", type: "BA" },
    { name: "Indigenous Studies", faculty: "Arts", type: "BA" },
    { name: "International Economics and Finance", faculty: "Arts", type: "BA" },
    { name: "Philosophy", faculty: "Arts", type: "BA" },
    { name: "Politics and Governance", faculty: "Arts", type: "BA" },
    { name: "Psychology", faculty: "Arts", type: "BA" },
    { name: "Sociology", faculty: "Arts", type: "BA" },
    { name: "Spanish", faculty: "Arts", type: "BA" },
    { name: "Undeclared Arts", faculty: "Arts", type: "BA" },

    // Ted Rogers School of Management
    { name: "Accounting and Finance", faculty: "Business", type: "BComm" },
    { name: "Entrepreneurship and Strategy", faculty: "Business", type: "BComm" },
    { name: "Global Management Studies", faculty: "Business", type: "BComm" },
    { name: "Human Resources Management", faculty: "Business", type: "BComm" },
    { name: "Information Technology Management", faculty: "Business", type: "BComm" },
    { name: "Law and Business", faculty: "Business", type: "BComm" },
    { name: "Marketing Management", faculty: "Business", type: "BComm" },
    { name: "Real Estate Management", faculty: "Business", type: "BComm" },
    { name: "Retail Management", faculty: "Business", type: "BComm" },
    { name: "Business Management", faculty: "Business", type: "BComm" },
    { name: "Business Technology Management", faculty: "Business", type: "BTM" },
    { name: "Hospitality and Tourism Management", faculty: "Business", type: "BComm" },

    // Faculty of Community Services
    { name: "Child and Youth Care", faculty: "Community Services", type: "BA" },
    { name: "Criminology and Criminal Justice Policy", faculty: "Community Services", type: "BA" },
    { name: "Disability Studies", faculty: "Community Services", type: "BA" },
    { name: "Early Childhood Studies", faculty: "Community Services", type: "BA" },
    { name: "Health Administration", faculty: "Community Services", type: "BHA" },
    { name: "Midwifery", faculty: "Community Services", type: "BMid" },
    { name: "Nursing", faculty: "Community Services", type: "BScN" },
    { name: "Nutrition and Food", faculty: "Community Services", type: "BSc" },
    { name: "Occupational and Public Health", faculty: "Community Services", type: "BSc" },
    { name: "Public Health and Safety", faculty: "Community Services", type: "BSc" },
    { name: "Social Work", faculty: "Community Services", type: "BSW" },
    { name: "Sport Media", faculty: "Community Services", type: "BA" },
    { name: "Urban and Regional Planning", faculty: "Community Services", type: "BUrPl" },

    // Faculty of Engineering and Architectural Science
    { name: "Aerospace Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Architectural Science", faculty: "Engineering", type: "BArchSc" },
    { name: "Biomedical Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Chemical Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Civil Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Computer Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Electrical Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Industrial Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Mechanical Engineering", faculty: "Engineering", type: "BEng" },

    // Faculty of Science
    { name: "Biology", faculty: "Science", type: "BSc" },
    { name: "Biomedical Sciences", faculty: "Science", type: "BSc" },
    { name: "Chemistry", faculty: "Science", type: "BSc" },
    { name: "Computer Science", faculty: "Science", type: "BSc" },
    { name: "Financial Mathematics", faculty: "Science", type: "BSc" },
    { name: "Mathematics and its Applications", faculty: "Science", type: "BSc" },
    { name: "Medical Physics", faculty: "Science", type: "BSc" },
    { name: "Physics", faculty: "Science", type: "BSc" },

    // The Creative School (formerly Communication & Design)
    { name: "Creative Industries", faculty: "Creative School", type: "BA" },
    { name: "Fashion", faculty: "Creative School", type: "BA" },
    { name: "Fashion Communication", faculty: "Creative School", type: "BA" },
    { name: "Graphic Communications Management", faculty: "Creative School", type: "BTech" },
    { name: "Image Arts", faculty: "Creative School", type: "BFA" },
    { name: "Interior Design", faculty: "Creative School", type: "BID" },
    { name: "Journalism", faculty: "Creative School", type: "BJour" },
    { name: "Media Production", faculty: "Creative School", type: "BFA" },
    { name: "Performance Acting", faculty: "Creative School", type: "BFA" },
    { name: "Performance Dance", faculty: "Creative School", type: "BFA" },
    { name: "Performance Production", faculty: "Creative School", type: "BFA" },
    { name: "Professional Communication", faculty: "Creative School", type: "BA" },
    { name: "Public Relations", faculty: "Creative School", type: "BA" },
    { name: "Radio and Television Arts", faculty: "Creative School", type: "BA" },
    { name: "Sport Media", faculty: "Creative School", type: "BA" }
  ];

  // Filter programs based on input
  const filterPrograms = (query) => {
    if (!query) {
      return tmuPrograms.slice(0, 10); // Show first 10 when no query
    }

    const filtered = tmuPrograms.filter(program =>
      program.name.toLowerCase().includes(query.toLowerCase()) ||
      program.faculty.toLowerCase().includes(query.toLowerCase()) ||
      program.type.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, 10); // Limit to 10 results
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const filtered = filterPrograms(newValue);
    setFilteredPrograms(filtered);
    setIsDropdownOpen(true);
    
    // Validate if the program exists in our list
    const exactMatch = tmuPrograms.find(program => 
      program.name.toLowerCase() === newValue.toLowerCase()
    );
    
    if (onValidation) {
      onValidation(!!exactMatch);
    }
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // Handle program selection
  const handleProgramSelect = (program) => {
    setInputValue(program.name);
    setIsDropdownOpen(false);
    
    if (onChange) {
      onChange(program.name);
    }
    
    if (onValidation) {
      onValidation(true);
    }
  };

  // Handle focus
  const handleFocus = () => {
    const filtered = filterPrograms(inputValue);
    setFilteredPrograms(filtered);
    setIsDropdownOpen(true);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize filtered programs when component mounts
  useEffect(() => {
    if (inputValue) {
      const filtered = filterPrograms(inputValue);
      setFilteredPrograms(filtered);
    }
  }, [inputValue]);

  return (
    <div className="space-y-2">
      <label className="block text-white text-sm mb-1">
        Program
        <span className="text-gray-400 ml-1">(Toronto Metropolitan University)</span>
      </label>
      
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder="Search for your program..."
            className="w-full px-3 py-2 pl-10 pr-10 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gray-400"
          />
          
          {/* Search icon */}
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          
          {/* Dropdown toggle */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredPrograms.length > 0 ? (
              <>
                <div className="p-2 text-xs text-gray-400 border-b border-gray-600">
                  {filteredPrograms.length} program{filteredPrograms.length !== 1 ? 's' : ''} found
                </div>
                {filteredPrograms.map((program, index) => (
                  <button
                    key={index}
                    onClick={() => handleProgramSelect(program)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-600 focus:bg-gray-600 focus:outline-none border-b border-gray-600 last:border-b-0"
                  >
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{program.name}</span>
                      <span className="text-sm text-gray-400">
                        {program.type} • {program.faculty}
                      </span>
                    </div>
                  </button>
                ))}
                
                {/* Link to TMU programs page */}
                <div className="p-2 border-t border-gray-600">
                  <a
                    href="https://www.torontomu.ca/programs/undergraduate/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-xs text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View all TMU programs
                  </a>
                </div>
              </>
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-400 mb-2">No programs found</p>
                <p className="text-xs text-gray-500">
                  Can't find your program? You can still type it manually.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Help text */}
      <p className="text-xs text-gray-400">
        Start typing to search from {tmuPrograms.length} undergraduate programs at TMU
      </p>
    </div>
  );
};

export default Program;