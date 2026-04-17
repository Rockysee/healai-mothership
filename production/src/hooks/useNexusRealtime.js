import { useEffect, useState, useCallback, useRef } from 'react';
import echo from '../lib/echo';

/**
 * Custom React hook for subscribing to MedPod NEXUS real-time events via Laravel Reverb.
 *
 * Handles subscriptions to:
 * - dispatch-board: New emergencies and trip updates
 * - fleet-map: Ambulance location updates
 * - alerts: Stock and system alerts
 * - trips.{tripId}: Specific trip status updates
 *
 * @returns {Object} Real-time state and event data
 *   - trips: Map of trip IDs to trip status data
 *   - fleetPositions: Map of ambulance IDs to location data
 *   - alerts: Array of recent alerts
 *   - emergencies: Array of recent emergency broadcasts
 *   - isConnected: Boolean indicating Echo connection status
 *   - subscribe: Function to subscribe to a specific trip channel
 *   - unsubscribe: Function to unsubscribe from a specific trip channel
 */
export const useNexusRealtime = () => {
  const [trips, setTrips] = useState({});
  const [fleetPositions, setFleetPositions] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Track which channels we're subscribed to
  const subscriptionsRef = useRef({
    'dispatch-board': null,
    'fleet-map': null,
    alerts: null,
  });

  // Subscribe to a specific trip channel
  const subscribe = useCallback((tripId) => {
    if (!tripId || subscriptionsRef.current[`trips.${tripId}`]) {
      return;
    }

    try {
      const channel = echo.private(`trips.${tripId}`);

      channel
        .listen('trip.status.updated', (event) => {
          setTrips((prev) => ({
            ...prev,
            [event.trip_id]: {
              id: event.trip_id,
              status: event.status,
              ambulance_id: event.ambulance_id,
              location: event.location,
              timestamp: event.timestamp,
            },
          }));
        })
        .error((error) => {
          console.error(`Error subscribing to trip ${tripId}:`, error);
        });

      subscriptionsRef.current[`trips.${tripId}`] = channel;
    } catch (error) {
      console.error('Failed to subscribe to trip channel:', error);
    }
  }, []);

  // Unsubscribe from a specific trip channel
  const unsubscribe = useCallback((tripId) => {
    if (!tripId || !subscriptionsRef.current[`trips.${tripId}`]) {
      return;
    }

    try {
      echo.leave(`trips.${tripId}`);
      delete subscriptionsRef.current[`trips.${tripId}`];
    } catch (error) {
      console.error('Failed to unsubscribe from trip channel:', error);
    }
  }, []);

  // Initialize global channel subscriptions
  useEffect(() => {
    let mounted = true;

    const initializeChannels = () => {
      try {
        // Subscribe to dispatch board
        if (!subscriptionsRef.current['dispatch-board']) {
          const dispatchBoard = echo.private('dispatch-board');

          dispatchBoard
            .listen('emergency.created', (event) => {
              if (mounted) {
                setEmergencies((prev) => [
                  {
                    trip_id: event.trip_id,
                    emergency_type: event.emergency_type,
                    location: event.location,
                    patient_info: event.patient_info,
                    priority: event.priority,
                    timestamp: event.timestamp,
                  },
                  ...prev.slice(0, 49), // Keep last 50
                ]);
              }
            })
            .listen('trip.status.updated', (event) => {
              if (mounted) {
                setTrips((prev) => ({
                  ...prev,
                  [event.trip_id]: {
                    id: event.trip_id,
                    status: event.status,
                    ambulance_id: event.ambulance_id,
                    location: event.location,
                    timestamp: event.timestamp,
                  },
                }));
              }
            })
            .error((error) => {
              console.error('Error on dispatch-board channel:', error);
            });

          subscriptionsRef.current['dispatch-board'] = dispatchBoard;
        }

        // Subscribe to fleet map
        if (!subscriptionsRef.current['fleet-map']) {
          const fleetMap = echo.private('fleet-map');

          fleetMap
            .listen('ambulance.location.updated', (event) => {
              if (mounted) {
                setFleetPositions((prev) => ({
                  ...prev,
                  [event.ambulance_id]: {
                    ambulance_id: event.ambulance_id,
                    lat: event.lat,
                    lng: event.lng,
                    speed: event.speed,
                    bearing: event.bearing,
                    timestamp: event.timestamp,
                  },
                }));
              }
            })
            .error((error) => {
              console.error('Error on fleet-map channel:', error);
            });

          subscriptionsRef.current['fleet-map'] = fleetMap;
        }

        // Subscribe to alerts
        if (!subscriptionsRef.current['alerts']) {
          const alertsChannel = echo.private('alerts');

          alertsChannel
            .listen('stock.alert', (event) => {
              if (mounted) {
                setAlerts((prev) => [
                  {
                    type: 'stock',
                    item_id: event.item_id,
                    ambulance_id: event.ambulance_id,
                    item_name: event.item_name,
                    current_quantity: event.current_quantity,
                    minimum_quantity: event.minimum_quantity,
                    timestamp: event.timestamp,
                  },
                  ...prev.slice(0, 99), // Keep last 100
                ]);
              }
            })
            .error((error) => {
              console.error('Error on alerts channel:', error);
            });

          subscriptionsRef.current['alerts'] = alertsChannel;
        }

        if (mounted) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Failed to initialize Echo channels:', error);
      }
    };

    initializeChannels();

    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      Object.keys(subscriptionsRef.current).forEach((channel) => {
        if (subscriptionsRef.current[channel]) {
          try {
            echo.leave(channel);
          } catch (error) {
            console.error(`Failed to leave channel ${channel}:`, error);
          }
        }
      });
    };
  }, []);

  return {
    trips,
    fleetPositions,
    alerts,
    emergencies,
    isConnected,
    subscribe,
    unsubscribe,
  };
};

export default useNexusRealtime;
