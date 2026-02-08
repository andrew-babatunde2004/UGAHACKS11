import { ImageBackground } from "react-native";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// ------------------- Types & Mock Data -------------------

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";



// Freshness Constants
const SEVEN_DAYS = 3 * 24 * 60 * 60 * 1000;

// Colors
const COLOR_EXPIRED = "#EF4444"; // Red-500
const COLOR_SOON = "#F97316";    // Orange-500
const COLOR_FRESH = "#10B981";   // Emerald-500
const COLOR_UNKNOWN = "#9CA3AF"; // Gray-400

const locationLabel = (location) => {
  if (location === 1) return "Refrigerator";
  if (location === 2) return "Freezer";
  return "Pantry";
};

// Helper: Determine status from date
const getFreshness = (dateStr) => {
  const today = new Date();
  let expDate;

  if (typeof dateStr === "string") {
    const trimmed = dateStr.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      expDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else {
      expDate = new Date(trimmed);
    }
  } else {
    expDate = new Date(dateStr);
  }

  if (Number.isNaN(expDate.getTime())) return { status: "Unknown", color: COLOR_UNKNOWN };

  const diff = expDate.getTime() - today.getTime();

  if (diff < 0) {
    return { status: "Expired", color: COLOR_EXPIRED };
  } else if (diff <= SEVEN_DAYS) {
    return { status: "Expiring Soon", color: COLOR_SOON };
  } else {
    return { status: "Fresh", color: COLOR_FRESH };
  }
};

// ------------------- Pie Chart Components -------------------

const PIE_SIZE = 280;

// Individual Slice Component
const PieSlice = ({ color, angle, startAngle, radius }) => {
  if (angle <= 0) return null;

  // We can only draw up to 180 degrees with one semicircle clip.
  // If angle > 180, we need two slices.
  if (angle > 180) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <PieSlice color={color} angle={180} startAngle={startAngle} radius={radius} />
        <PieSlice color={color} angle={angle - 180} startAngle={startAngle + 180} radius={radius} />
      </View>
    );
  }

  // Robust Algorithm for Web/Native Compatibility:
  // 1. "RightClipper": A window showing only the Right Hemisphere (0 to 180 degrees).
  // 2. "Rotator": A Container rotated by `angle` degrees.
  // 3. "LeftSlice": A Left Hemisphere (180 to 360 degrees) inside the Rotator.
  //
  // Logic:
  // - Initially (angle=0): LeftSlice is at 180-360. No overlap with RightClipper (0-180).
  // - Rotate by 'a': LeftSlice moves to [180+a, 360+a] -> equivalent to [180+a, a].
  // - Intersection with [0, 180] is exactly [0, a]. Perfect slice.

  return (
    <View
      style={[
        styles.sliceContainer,
        {
          width: radius * 2,
          height: radius * 2,
          transform: [{ rotate: `${startAngle}deg` }],
        },
      ]}
    >
      {/* Right Clipper (0 to 180 zone) */}
      <View style={{
        width: radius,
        height: radius * 2,
        position: 'absolute',
        left: radius, // Positioned on the right half
        top: 0,
        overflow: 'hidden',
      }}>
        {/* Rotator: Rotates the content into the view */}
        <View style={{
          width: radius * 2,
          height: radius * 2,
          position: 'absolute',
          left: -radius, // Shift back so center aligns
          top: 0,
          transform: [{ rotate: `${angle}deg` }],
        }}>
          {/* Left Slice (The colored semi-circle) */}
          <View style={{
            width: radius,
            height: radius * 2,
            position: 'absolute',
            left: 0, // Occupies the left half of the Rotator
            top: 0,
            backgroundColor: color,
            borderTopLeftRadius: radius,
            borderBottomLeftRadius: radius,
          }} />
        </View>
      </View>
    </View>
  );
};

const PieChart = ({ counts }) => {
  const total = counts.expired + counts.soon + counts.fresh;
  if (total === 0) {
    return (
      <View style={[styles.chartContainer, { width: PIE_SIZE, height: PIE_SIZE, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '600' }}>No Data</Text>
      </View>
    );
  }

  // Calculate angles
  const angleExp = (counts.expired / total) * 360;
  const angleSoon = (counts.soon / total) * 360;
  const angleFresh = (counts.fresh / total) * 360;

  // We accumulate start angles
  // Order: Expired -> Soon -> Fresh (or any order)
  const slices = [];
  let currentStart = 0; // 0 is top (12 o'clock)

  if (angleExp > 0) {
    slices.push({ color: COLOR_EXPIRED, angle: angleExp, start: currentStart });
    currentStart += angleExp;
  }
  if (angleSoon > 0) {
    slices.push({ color: COLOR_SOON, angle: angleSoon, start: currentStart });
    currentStart += angleSoon;
  }
  if (angleFresh > 0) {
    slices.push({ color: COLOR_FRESH, angle: angleFresh, start: currentStart });
    currentStart += angleFresh;
  }

  return (
    <View style={styles.chartWrapper}>
      <View style={[styles.chartContainer, { width: PIE_SIZE, height: PIE_SIZE }]}>
        {slices.map((slice, i) => (
          <PieSlice
            key={i}
            color={slice.color}
            angle={slice.angle}
            startAngle={slice.start}
            radius={PIE_SIZE / 2}
          />
        ))}
        {/* Inner White Circle to make it a Donut (Optional, looks nicer)
                User asked for "Circle Graph", commonly Pie.
                If they want Donut, we add this. Let's make it a Pie as requested (solid).
                If I leave it solid, it's a Pie.
            */}
      </View>

      {/* Legend / Stats */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_EXPIRED }]} />
          <Text style={styles.legendText}>Expired ({Math.round(angleExp / 3.6)}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_SOON }]} />
          <Text style={styles.legendText}>Soon ({Math.round(angleSoon / 3.6)}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: COLOR_FRESH }]} />
          <Text style={styles.legendText}>Fresh ({Math.round(angleFresh / 3.6)}%)</Text>
        </View>
      </View>
    </View>
  );
};


export default function Tracker() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ expired: 0, soon: 0, fresh: 0 });
  const statusRank = { "Expired": 0, "Expiring Soon": 1, "Fresh": 2, "Unknown": 3 };

  const fetchData = React.useCallback(() => {
    fetch(`${API_BASE_URL}/foodstuff`)
      .then(r => r.json())
      .then(data => {
        // Handle both array and object response (just in case)
        const list = Array.isArray(data) ? data : data?.items ?? [];

        // Normalize the data (map _id to id if needed, handle dates)
        const normalizedItems = list.map(item => {
          const rawExpiration = item.expirationDate;
          const expirationDate = rawExpiration
            ? new Date(rawExpiration).toISOString().split('T')[0]
            : "Unknown";

          return {
            ...item,
            id: item._id || item.id,
            name: item.name,
            expirationDate,
          };
        });

        setItems(normalizedItems);
      })
      .catch(e => console.log("ERR:", e));
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    let exp = 0;
    let soon = 0;
    let fresh = 0;

    items.forEach(item => {
      const { status } = getFreshness(item.expirationDate);
      if (status === "Expired") exp++;
      else if (status === "Expiring Soon") soon++;
      else fresh++;
    });

    setCounts({ expired: exp, soon: soon, fresh: fresh });
  }, [items]);

  const renderItem = ({ item }) => {
    const { status, color } = getFreshness(item.expirationDate);


    return (
      <View style={[styles.itemBlock, { backgroundColor: color + "20", borderColor: color }]}>
        <View style={[styles.iconBox, { backgroundColor: color }]}>
          <Feather name={status === "Expired" ? "alert-circle" : status === "Fresh" ? "check-circle" : "clock"} size={20} color="white" />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={[styles.itemDate, { color: color }]}>{status} • {item.expirationDate}</Text>
          <Text style={styles.itemLocation}>Location: {locationLabel(item.location)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground
      source={{
        uri: ("https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/old-books-in-library-shelf-luoman.jpg")
      }}
      style={{ flex: 1 }}
      resizeMode="cover" >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
              <Feather name="chevron-left" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitleText}>Freshness Tracker</Text>
          </View>

          <View style={styles.chartSection}>
            <PieChart counts={counts} />
          </View>

          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Tracked Foods</Text>
            <FlatList
              data={[...items].sort((a, b) => {
                const aStatus = getFreshness(a.expirationDate).status;
                const bStatus = getFreshness(b.expirationDate).status;
                const rankDiff = statusRank[aStatus] - statusRank[bStatus];
                if (rankDiff !== 0) return rankDiff;
                const aTime = new Date(a.expirationDate).getTime();
                const bTime = new Date(b.expirationDate).getTime();
                if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;
                return 0;
              })}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground >
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
  },
  chartSection: {
    backgroundColor: "rgba(224, 215, 251, 1)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 320,
    borderWidth: 1,
    borderColor: "rgba(180,120,255,0.4)",
    shadowColor: "#a855f7",
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },

  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliceClipper: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  sliceContent: {
    position: 'absolute',
    top: 0,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 14,
  },
  listSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemBlock: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 100,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  itemDate: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  }
  ,
  itemLocation: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    color: "#374151",
  }
});
