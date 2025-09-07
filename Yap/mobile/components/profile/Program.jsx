import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Search, ChevronDown } from 'lucide-react-native';

function Program({ value, onChange }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredPrograms, setFilteredPrograms] = useState([]);

  // TMU undergraduate programs (simplified list)
  const tmuPrograms = [
    // Faculty of Arts
    { name: "Arts and Contemporary Studies", faculty: "Arts", type: "BA" },
    { name: "Criminology", faculty: "Arts", type: "BA" },
    { name: "Economics", faculty: "Arts", type: "BA" },
    { name: "English", faculty: "Arts", type: "BA" },
    { name: "History", faculty: "Arts", type: "BA" },
    { name: "Psychology", faculty: "Arts", type: "BA" },
    { name: "Sociology", faculty: "Arts", type: "BA" },

    // Ted Rogers School of Management
    { name: "Accounting and Finance", faculty: "Business", type: "BComm" },
    { name: "Business Management", faculty: "Business", type: "BComm" },
    { name: "Marketing Management", faculty: "Business", type: "BComm" },
    { name: "Information Technology Management", faculty: "Business", type: "BComm" },

    // Faculty of Engineering and Architectural Science
    { name: "Computer Science", faculty: "Engineering", type: "BSc" },
    { name: "Software Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Computer Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Electrical Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Mechanical Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Civil Engineering", faculty: "Engineering", type: "BEng" },
    { name: "Biomedical Engineering", faculty: "Engineering", type: "BEng" },

    // Faculty of Science
    { name: "Biology", faculty: "Science", type: "BSc" },
    { name: "Chemistry", faculty: "Science", type: "BSc" },
    { name: "Mathematics", faculty: "Science", type: "BSc" },
    { name: "Physics", faculty: "Science", type: "BSc" },

    // RTA School of Media
    { name: "Media Production", faculty: "Media", type: "BA" },
    { name: "Journalism", faculty: "Media", type: "BA" },
    { name: "Creative Industries", faculty: "Media", type: "BA" }
  ];

  const handleInputChange = (text) => {
    setInputValue(text);
    if (onChange) {
      onChange(text);
    }

    // Filter programs based on input
    if (text.length > 0) {
      const filtered = tmuPrograms.filter(program =>
        program.name.toLowerCase().includes(text.toLowerCase()) ||
        program.faculty.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredPrograms(filtered);
    } else {
      setFilteredPrograms(tmuPrograms);
    }
  };

  const handleProgramSelect = (program) => {
    const programText = `${program.name} (${program.type})`;
    setInputValue(programText);
    if (onChange) {
      onChange(programText);
    }
    setIsDropdownOpen(false);
  };

  const openDropdown = () => {
    setFilteredPrograms(tmuPrograms);
    setIsDropdownOpen(true);
  };

  return (
    <View>
      <Text style={{
        color: '#ffffff',
        fontSize: 14,
        marginBottom: 8,
        fontFamily: 'System'
      }}>
        Program
      </Text>
      
      <TouchableOpacity
        onPress={openDropdown}
        style={{
          backgroundColor: '#374151',
          borderWidth: 1,
          borderColor: '#6b7280',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Text style={{
          color: inputValue ? '#ffffff' : '#6b7280',
          fontSize: 16,
          flex: 1,
          fontFamily: 'System'
        }}>
          {inputValue || 'Select your program'}
        </Text>
        <ChevronDown size={20} color="#6b7280" />
      </TouchableOpacity>

      {/* Program Selection Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: '#1c1c1c',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80%'
          }}>
            {/* Header */}
            <View style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#374151'
            }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 18,
                  fontWeight: 'bold',
                  fontFamily: 'System'
                }}>
                  Select Program
                </Text>
                <TouchableOpacity
                  onPress={() => setIsDropdownOpen(false)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: '#374151'
                  }}
                >
                  <Text style={{
                    color: '#ffffff',
                    fontFamily: 'System'
                  }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search Input */}
              <View style={{
                backgroundColor: '#374151',
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12
              }}>
                <Search size={16} color="#9ca3af" />
                <TextInput
                  placeholder="Search programs..."
                  placeholderTextColor="#6b7280"
                  value={inputValue}
                  onChangeText={handleInputChange}
                  style={{
                    flex: 1,
                    padding: 12,
                    color: '#ffffff',
                    fontFamily: 'System'
                  }}
                />
              </View>
            </View>

            {/* Programs List */}
            <ScrollView style={{ padding: 16 }}>
              {filteredPrograms.map((program, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleProgramSelect(program)}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: '#374151'
                  }}
                >
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: '500',
                    fontFamily: 'System'
                  }}>
                    {program.name}
                  </Text>
                  <Text style={{
                    color: '#9ca3af',
                    fontSize: 14,
                    marginTop: 4,
                    fontFamily: 'System'
                  }}>
                    {program.faculty} • {program.type}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {filteredPrograms.length === 0 && (
                <View style={{
                  padding: 32,
                  alignItems: 'center'
                }}>
                  <Text style={{
                    color: '#9ca3af',
                    fontSize: 16,
                    textAlign: 'center',
                    fontFamily: 'System'
                  }}>
                    No programs found
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Program;