import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  MapPin, 
  X, 
  Target, 
  RefreshCw, 
  AlertCircle, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react-native';

function WaypointHeader({ 
  placementMode, 
  onTogglePlacementMode, 
  onRefresh, 
  refreshing, 
  waypointCount, 
  error, 
  onClearError,
  onOpenSavedWaypoints,
  isNavigatingSaved = false,
  currentSavedIndex = -1,
  savedWaypointsCount = 0,
  onPreviousSaved,
  onNextSaved,
  onExitSavedNavigation
}) {
  return (
    <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
      {/* Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MapPin size={32} color="#fb923c" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#ffffff',
              fontFamily: 'System'
            }}>
              Waypoint
            </Text>
            <Text style={{
              color: '#9ca3af',
              fontSize: 14,
              fontFamily: 'System'
            }}>
              Real-time campus community map
            </Text>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isNavigatingSaved ? (
            <>
              <View style={{
                backgroundColor: '#7c3aed',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Bookmark size={16} color="white" />
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  marginLeft: 6,
                  fontSize: 12,
                  fontFamily: 'System'
                }}>
                  {currentSavedIndex + 1}/{savedWaypointsCount}
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={onExitSavedNavigation}
                style={{
                  backgroundColor: '#ef4444',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                <X size={16} color="white" />
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  marginLeft: 4,
                  fontSize: 12,
                  fontFamily: 'System'
                }}>
                  Exit
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={onOpenSavedWaypoints}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                <Bookmark size={16} color="#a855f7" />
                <Text style={{
                  color: '#ffffff',
                  fontWeight: 'bold',
                  marginLeft: 6,
                  fontSize: 12,
                  fontFamily: 'System'
                }}>
                  Saved
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={onTogglePlacementMode}
                style={{
                  backgroundColor: placementMode ? '#f97316' : '#1f2937',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                {placementMode ? (
                  <X size={16} color="white" />
                ) : (
                  <Target size={16} color="#ffffff" />
                )}
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  marginLeft: 6,
                  fontSize: 12,
                  fontFamily: 'System'
                }}>
                  {placementMode ? 'Cancel' : 'Place'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onRefresh}
                disabled={refreshing}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  opacity: refreshing ? 0.5 : 1
                }}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <RefreshCw size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Status Text */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{
          color: '#9ca3af',
          fontSize: 12,
          fontFamily: 'System',
          textAlign: 'right'
        }}>
          {isNavigatingSaved ? (
            '🔖 Navigating saved waypoints'
          ) : placementMode ? (
            '🎯 Tap map to place waypoint'
          ) : (
            '📍 Enable placement mode to add waypoints'
          )}
        </Text>
        <Text style={{
          color: '#9ca3af',
          fontSize: 12,
          fontFamily: 'System',
          textAlign: 'right'
        }}>
          🗺️ {waypointCount} active waypoints
        </Text>
        {isNavigatingSaved && (
          <Text style={{
            color: '#a855f7',
            fontSize: 10,
            fontFamily: 'System',
            textAlign: 'right'
          }}>
            Use navigation buttons to browse
          </Text>
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={{
          marginTop: 16,
          backgroundColor: '#7f1d1d',
          borderColor: '#991b1b',
          borderWidth: 1,
          borderRadius: 8,
          padding: 12
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AlertCircle size={20} color="#fca5a5" />
            <Text style={{
              color: '#fca5a5',
              marginLeft: 8,
              flex: 1,
              fontFamily: 'System'
            }}>
              {error}
            </Text>
            <TouchableOpacity 
              onPress={onClearError}
              style={{ padding: 8 }}
            >
              <Text style={{ color: '#fca5a5', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default WaypointHeader;