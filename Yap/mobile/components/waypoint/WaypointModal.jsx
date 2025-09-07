import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MapPin, X } from 'lucide-react-native';

function WaypointModal({ isOpen, onClose, onSubmit, location }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('food');
  const [submitting, setSubmitting] = useState(false);

  const waypointTypes = [
    { value: 'food', label: '🍕 Food & Events', emoji: '🍕' },
    { value: 'study', label: '📚 Study Spot', emoji: '📚' },
    { value: 'group', label: '👥 Study Group', emoji: '👥' },
    { value: 'social', label: '🎉 Social', emoji: '🎉' },
    { value: 'event', label: '📅 Event', emoji: '📅' },
    { value: 'other', label: '📍 Other', emoji: '📍' }
  ];

  const handleSubmit = async () => {
    if (title.trim() && description.trim() && !submitting) {
      setSubmitting(true);
      try {
        await onSubmit({ title, description, type });
        // Reset form
        setTitle('');
        setDescription('');
        setType('food');
      } catch (error) {
        Alert.alert('Error', 'Failed to create waypoint');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setTitle('');
      setDescription('');
      setType('food');
      onClose();
    }
  };

  const selectedType = waypointTypes.find(t => t.value === type);

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          backgroundColor: '#171717',
          borderRadius: 16,
          padding: 20,
          width: '90%',
          maxWidth: 400,
          maxHeight: '80%'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#f97316',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <MapPin size={20} color="white" />
              </View>
              <View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontFamily: 'System'
                }}>
                  Create Waypoint
                </Text>
                {location && (
                  <Text style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    fontFamily: 'System'
                  }}>
                    📍 {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={{
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: '#1f2937',
                opacity: submitting ? 0.5 : 1
              }}
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Type Selection */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#d1d5db',
                marginBottom: 12,
                fontFamily: 'System'
              }}>
                Waypoint Type
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {waypointTypes.map((typeOption) => (
                  <TouchableOpacity
                    key={typeOption.value}
                    onPress={() => setType(typeOption.value)}
                    disabled={submitting}
                    style={{
                      backgroundColor: type === typeOption.value ? '#f97316' : '#1f2937',
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      opacity: submitting ? 0.5 : 1,
                      borderWidth: type === typeOption.value ? 2 : 1,
                      borderColor: type === typeOption.value ? '#fb923c' : '#374151'
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 6 }}>
                      {typeOption.emoji}
                    </Text>
                    <Text style={{
                      color: type === typeOption.value ? 'white' : '#d1d5db',
                      fontSize: 14,
                      fontWeight: type === typeOption.value ? 'bold' : 'normal',
                      fontFamily: 'System'
                    }}>
                      {typeOption.label.split(' ').slice(1).join(' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Title Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#d1d5db',
                marginBottom: 8,
                fontFamily: 'System'
              }}>
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Free coffee here!"
                placeholderTextColor="#6b7280"
                maxLength={100}
                editable={!submitting}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  fontFamily: 'System',
                  opacity: submitting ? 0.5 : 1
                }}
              />
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 4
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  fontFamily: 'System'
                }}>
                  Make it catchy and clear
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#6b7280',
                  fontFamily: 'System'
                }}>
                  {title.length}/100
                </Text>
              </View>
            </View>

            {/* Description Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#d1d5db',
                marginBottom: 8,
                fontFamily: 'System'
              }}>
                Description
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Tell others what's happening here..."
                placeholderTextColor="#6b7280"
                maxLength={500}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!submitting}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  minHeight: 100,
                  fontFamily: 'System',
                  opacity: submitting ? 0.5 : 1
                }}
              />
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 4
              }}>
                <Text style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  fontFamily: 'System'
                }}>
                  Provide helpful details
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#6b7280',
                  fontFamily: 'System'
                }}>
                  {description.length}/500
                </Text>
              </View>
            </View>

            {/* Duration Info */}
            <View style={{
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              borderColor: 'rgba(249, 115, 22, 0.3)',
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 14,
                color: '#fb923c',
                fontFamily: 'System'
              }}>
                <Text style={{ fontWeight: 'bold' }}>⏰ Duration:</Text> This waypoint will automatically expire after 1 week
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={submitting}
                style={{
                  flex: 1,
                  backgroundColor: '#374151',
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: 'center',
                  opacity: submitting ? 0.5 : 1
                }}
              >
                <Text style={{
                  color: '#d1d5db',
                  fontSize: 16,
                  fontWeight: 'bold',
                  fontFamily: 'System'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
                style={{
                  flex: 1,
                  backgroundColor: submitting || !title.trim() || !description.trim() ? '#6b7280' : '#f97316',
                  borderRadius: 8,
                  paddingVertical: 16,
                  alignItems: 'center'
                }}
              >
                {submitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={{
                      color: 'white',
                      fontSize: 16,
                      fontWeight: 'bold',
                      marginLeft: 8,
                      fontFamily: 'System'
                    }}>
                      Creating...
                    </Text>
                  </View>
                ) : (
                  <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Create Waypoint
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default WaypointModal;