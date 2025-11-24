import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type InsuranceType = 'contributivo' | 'subsidiado';

interface OxygenEntry {
  id: string;
  startTime: string;
  endTime: string;
  flowRate: string;
}

export default function OxygenCalculatorScreen() {
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('contributivo');
  const [entries, setEntries] = useState<OxygenEntry[]>(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: `entry-${i}`,
      startTime: '',
      endTime: '',
      flowRate: '',
    }));
  });

  const paymentFactor = insuranceType === 'contributivo' ? 0.45 : 0.25;

  const calculateMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;

    const parseTime = (time: string): number | null => {
      const parts = time.trim().split(':');
      if (parts.length !== 2) return null;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return null;
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
      return hours * 60 + minutes;
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    if (startMinutes === null || endMinutes === null) return 0;

    let diff = endMinutes - startMinutes;
    if (diff < 0) {
      diff += 24 * 60;
    }

    return diff;
  };

  const calculateCost = useMemo(() => {
    return (entry: OxygenEntry): number => {
      const minutes = calculateMinutes(entry.startTime, entry.endTime);
      const flow = parseFloat(entry.flowRate) || 0;
      return minutes * flow * paymentFactor;
    };
  }, [paymentFactor]);

  const totalCost = useMemo(() => {
    return entries.reduce((sum, entry) => sum + calculateCost(entry), 0);
  }, [entries, calculateCost]);

  const addEntry = () => {
    setEntries([
      ...entries,
      {
        id: `entry-${Date.now()}`,
        startTime: '',
        endTime: '',
        flowRate: '',
      },
    ]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((entry) => entry.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof OxygenEntry, value: string) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons name="calculator" size={28} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Calculadora de Oxígeno</Text>
            </View>
            <Text style={styles.headerSubtitle}>Cálculo de costo por suministro</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Seguro</Text>
          <View style={styles.insuranceButtons}>
            <TouchableOpacity
              style={[
                styles.insuranceButton,
                insuranceType === 'contributivo' && styles.insuranceButtonActive,
              ]}
              onPress={() => setInsuranceType('contributivo')}
            >
              <Text
                style={[
                  styles.insuranceButtonText,
                  insuranceType === 'contributivo' &&
                    styles.insuranceButtonTextActive,
                ]}
              >
                Contributivo
              </Text>
              <Text
                style={[
                  styles.insuranceButtonFactor,
                  insuranceType === 'contributivo' &&
                    styles.insuranceButtonFactorActive,
                ]}
              >
                Factor: 0.45
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.insuranceButton,
                insuranceType === 'subsidiado' && styles.insuranceButtonActive,
              ]}
              onPress={() => setInsuranceType('subsidiado')}
            >
              <Text
                style={[
                  styles.insuranceButtonText,
                  insuranceType === 'subsidiado' &&
                    styles.insuranceButtonTextActive,
                ]}
              >
                Subsidiado
              </Text>
              <Text
                style={[
                  styles.insuranceButtonFactor,
                  insuranceType === 'subsidiado' &&
                    styles.insuranceButtonFactorActive,
                ]}
              >
                Factor: 0.25
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Registros de Suministro</Text>
            <TouchableOpacity style={styles.addButton} onPress={addEntry}>
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 30 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { width: 70 }]}>Inicio</Text>
            <Text style={[styles.tableHeaderText, { width: 70 }]}>Fin</Text>
            <Text style={[styles.tableHeaderText, { width: 55 }]}>L/min</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Min</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Costo</Text>
            <View style={{ width: 40 }} />
          </View>

          {entries.map((entry, index) => {
            const minutes = calculateMinutes(entry.startTime, entry.endTime);
            const cost = calculateCost(entry);
            return (
              <View key={entry.id} style={styles.tableRow}>
                <Text style={[styles.rowNumber, { width: 30 }]}>{index + 1}</Text>
                <TextInput
                  style={[styles.input, { width: 70 }]}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={entry.startTime}
                  onChangeText={(value) => updateEntry(entry.id, 'startTime', value)}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                />
                <TextInput
                  style={[styles.input, { width: 70 }]}
                  placeholder="HH:MM"
                  placeholderTextColor="#999"
                  value={entry.endTime}
                  onChangeText={(value) => updateEntry(entry.id, 'endTime', value)}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                />
                <TextInput
                  style={[styles.input, { width: 55 }]}
                  placeholder="0.0"
                  placeholderTextColor="#999"
                  value={entry.flowRate}
                  onChangeText={(value) => updateEntry(entry.id, 'flowRate', value)}
                  keyboardType="decimal-pad"
                />
                <Text style={[styles.calculatedValue, { flex: 1 }]}>
                  {minutes > 0 ? minutes : '-'}
                </Text>
                <Text style={[styles.calculatedValue, { flex: 1 }]}>
                  {cost > 0 ? `${cost.toFixed(2)}` : '-'}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeEntry(entry.id)}
                >
                  <MaterialCommunityIcons name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a Pagar</Text>
            <Text style={styles.totalAmount}>${totalCost.toFixed(2)}</Text>
            <Text style={styles.totalInfo}>
              Factor aplicado: {paymentFactor} ({insuranceType})
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0F766E',
    paddingBottom: 24,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CCFBF1',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 12,
  },
  insuranceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  insuranceButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  insuranceButtonActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  insuranceButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#334155',
    marginBottom: 4,
  },
  insuranceButtonTextActive: {
    color: '#FFFFFF',
  },
  insuranceButtonFactor: {
    fontSize: 12,
    color: '#64748B',
  },
  insuranceButtonFactorActive: {
    color: '#CCFBF1',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    gap: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#475569',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    gap: 8,
  },
  rowNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlign: 'center',
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#0F766E',
    textAlign: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#0F766E',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: '#0F766E',
    marginTop: 8,
  },
  totalInfo: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
});
