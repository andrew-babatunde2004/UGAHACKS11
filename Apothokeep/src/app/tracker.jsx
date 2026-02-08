import { ImageBackground } from "react-native";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Dimensions, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

// ------------------- Types & Mock Data -------------------

const MOCK_ITEMS = [
  { id: "1", name: "Expired Milk", expirationDate: "2023-10-01" }, // Expired (assuming today is > 2023)
  { id: "2", name: "Yogurt", expirationDate: "2026-02-09" },       // Expiring Soon (if close to today)
  { id: "3", name: "Fresh Apples", expirationDate: "2027-01-01" },  // Fresh
  { id: "4", name: "Old Bread", expirationDate: "2027-12-25" },    // Expired
  { id: "5", name: "Chicken", expirationDate: "2024-02-08" },      // Expiring Soon
  { id: "6", name: "Rice", expirationDate: "2025-06-15" },         // Fresh
];

// Freshness Constants
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

// Colors
const COLOR_EXPIRED = "#EF4444"; // Red-500
const COLOR_SOON = "#F97316";    // Orange-500
const COLOR_FRESH = "#10B981";   // Emerald-500
const COLOR_UNKNOWN = "#9CA3AF"; // Gray-400

// Helper: Determine status from date
const getFreshness = (dateStr) => {
  const today = new Date();
  const expDate = new Date(dateStr);
  const diff = expDate - today;

  if (isNaN(expDate.getTime())) return { status: "Unknown", color: COLOR_UNKNOWN };

  // Expired if date is BEFORE today (diff < 0)
  // Soon if date is within 7 days from today
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

  // The logic for a slice <= 180:
  // 1. Container rotated by `startAngle`.
  // 2. Clipper (Right half) allowing us to see 0-180 of the content.
  // 3. Content (Circle) rotated by `angle - 180`.
  //    - At 180 deg (full semicircle), rotation is 0. We see 0-180.
  //    - At 90 deg, rotation is -90. We see -90 to 90? No.
  //    - Let's visualize: 
  //      Right Half Clipper shows angles [0, 180] (assuming 0 is top, clockwise).
  //      Content Circle starts at 0.
  //      If we rotate Content by -90:
  //      The segment [0, 90] of the content moves to [-90, 0]. Not visible.
  //      The segment [90, 180] moves to [0, 90]. Visible.
  //      So a -90 rotation shows the LAST 90 degrees of the semicircle.
  //      Wait, we want the FIRST `angle` degrees.
  //      Maybe we need the Clipper to be the Left Half?
  //      Or rotate differently.

  // Let's stick to the proven formula:
  // Rotation = angle - 180?
  // If angle 30. Rot = -150.
  // Semicircle (0-180).
  // Rotated (-150 to 30).
  // Visible region (0 to 180).
  // Intersection (0 to 30).
  // This gives us the slice starting at 0, size 30.

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
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
};

const PieChart = ({ counts }) => {
  const total = counts.expired + counts.soon + counts.fresh;
  if (total === 0) {
    return (
      <View style={[styles.chartContainer, { width: PIE_SIZE, height: PIE_SIZE }]}>
        <Text>No Data</Text>
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
  const [items, setItems] = useState(MOCK_ITEMS);
  const [counts, setCounts] = useState({ expired: 0, soon: 0, fresh: 0 });

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
              data={items}
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
    backgroundColor: "#b2a3e5a1",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: 'center',
    minHeight: 320, // Enough space for chart + legend
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
});
