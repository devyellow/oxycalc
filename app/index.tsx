import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Linking,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import styles from './styles';
import TimePickerModal from './TimePickerModal';

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

  const [timePicker, setTimePicker] = useState<{
    visible: boolean;
    entryId?: string;
    field?: keyof OxygenEntry;
    date?: Date;
  }>({ visible: false });

  const [webTimePickerVisible, setWebTimePickerVisible] = useState(false);
  const [webTimePickerDate, setWebTimePickerDate] = useState<Date>(new Date());
  const [webTimePickerEntry, setWebTimePickerEntry] = useState<{
    entryId?: string;
    field?: keyof OxygenEntry;
  }>({});

  const parseTimeToDate = (time: string) => {
    const d = new Date();
    if (!time) return d;
    let s = time.trim().toUpperCase();

    // Handle 12h format with AM/PM
    const ampmMatch = /(AM|PM)$/.exec(s);
    if (ampmMatch) {
      const ampm = ampmMatch[1];
      const timePart = s.replace(/\s?(AM|PM)$/i, '').trim();
      const parts = timePart.split(':');
      if (parts.length !== 2) return d;
      let h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) || 0;
      if (isNaN(h)) h = 0;
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      d.setHours(h);
      d.setMinutes(m);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d;
    }

    // Fallback: accept 24h HH:MM
    const parts = s.split(':');
    if (parts.length !== 2) return d;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours)) d.setHours(hours);
    if (!isNaN(minutes)) d.setMinutes(minutes);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return d;
  };

  const formatDateToTime = (date: Date) => {
    const hours = date.getHours();
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    let h12 = hours % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${mm} ${ampm}`;
  };

  const openTimePicker = (entryId: string, field: keyof OxygenEntry) => {
    const entry = entries.find((e) => e.id === entryId);
    const date = entry ? parseTimeToDate(entry[field]) : new Date();
    // Web: use custom modal picker
    if (Platform.OS === 'web') {
      setWebTimePickerDate(date);
      setWebTimePickerEntry({ entryId, field });
      setWebTimePickerVisible(true);
      return;
    }
    // On Android use the native dialog helper for more reliable behavior
    if (Platform.OS === 'android' && DateTimePickerAndroid) {
      try {
        DateTimePickerAndroid.open({
          value: date,
          onChange: (event, selectedDate) => {
            // on Android, update directly using the captured entryId/field
            if (selectedDate) {
              const formatted = formatDateToTime(selectedDate as Date);
              updateEntry(entryId, field, formatted);
            }
          },
          mode: 'time',
          is24Hour: false,
        });
        return;
      } catch (e) {
        // fallback to showing inline picker
        console.warn('DateTimePickerAndroid.open failed, falling back to inline picker', e);
      }
    }

    setTimePicker({ visible: true, entryId, field, date });
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate && timePicker.entryId && timePicker.field) {
      const formatted = formatDateToTime(selectedDate);
      updateEntry(timePicker.entryId, timePicker.field, formatted);
    }
    // Close picker after selection or dismissal
    setTimePicker({ visible: false });
  };

  const paymentFactor = insuranceType === 'contributivo' ? 0.45 : 0.25;

  const calculateMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const parseTime = (time: string): number | null => {
      if (!time) return null;
      const s = time.trim().toUpperCase();
      // Match formats like '7:00 AM', '07:00 AM', '14:30', '14:30 PM' (last is invalid but handled)
      const m = s.match(/^\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\s*$/i);
      if (!m) return null;
      let hours = parseInt(m[1], 10);
      const minutes = parseInt(m[2], 10);
      const ampm = m[3];
      if (isNaN(hours) || isNaN(minutes)) return null;
      if (ampm) {
        // Convert 12h to 24h
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
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

  const buildShareMessage = () => {
    const lines: string[] = [];
    lines.push('Registro de suministros de oxígeno');
    lines.push('');
    // Header row
    lines.push('No. | Inicio | Fin | L/min | Min | Costo');
    lines.push('---------------------------------------------');
    entries.forEach((entry, i) => {
      // Include only rows with minutes > 0
      const mins = calculateMinutes(entry.startTime, entry.endTime);
      if (!mins || mins <= 0) return;
      const cost = calculateCost(entry);
      const inicio = entry.startTime || '-';
      const fin = entry.endTime || '-';
      const flow = entry.flowRate || '-';
      const costStr = cost > 0 ? cost.toFixed(2) : '-';
      lines.push(`${i + 1} | ${inicio} | ${fin} | ${flow} | ${mins} | ${costStr}`);
    });
    lines.push('');
    lines.push(`Total a Pagar: $${totalCost.toFixed(2)}`);
    lines.push(`Factor aplicado: ${paymentFactor} (${insuranceType})`);
    return lines.join('\n');
  };

  const shareViaWhatsApp = async () => {
    const msg = buildShareMessage();
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch (e) {
      // ignore and fallback
    }

    // Fallback: use generic Share API
    try {
      await Share.share({ message: msg });
    } catch (e) {
      Alert.alert('No se pudo compartir', 'Asegúrate de tener WhatsApp instalado o copia el texto manualmente.');
    }
  };

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
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const next = prev[idx + 1];
      const updated = prev.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry));
      if (field === 'endTime' && next && !next.startTime) {
        updated[idx + 1] = { ...next, startTime: value };
      }
      return updated;
    });
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

          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            style={styles.tableScroll}
            contentContainerStyle={styles.tableInner}
          >
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { width: 30 }]}>#</Text>
                <Text style={[styles.tableHeaderText, { width: 90 }]}>Inicio</Text>
                <Text style={[styles.tableHeaderText, { width: 90 }]}>Fin</Text>
                <Text style={[styles.tableHeaderText, { width: 55 }]}>L/min</Text>
                <Text style={[styles.tableHeaderText, { width: 80 }]}>Min</Text>
                <Text style={[styles.tableHeaderText, { width: 80 }]}>Costo</Text>
                <View style={{ width: 40 }} />
              </View>

              {entries.map((entry, index) => {
                const minutes = calculateMinutes(entry.startTime, entry.endTime);
                const cost = calculateCost(entry);
                return (
                  <View key={entry.id} style={styles.tableRow}>
                    <Text style={[styles.rowNumber, { width: 30 }]}>{index + 1}</Text>
                    <TouchableOpacity
                      style={[styles.inputFixed, { width: 90 }]}
                      onPress={() => openTimePicker(entry.id, 'startTime')}
                    >
                      <Text style={{ color: entry.startTime ? '#1E293B' : '#999', textAlign: 'center' }}>
                        {entry.startTime || 'HH:MM'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inputFixed, { width: 90 }]}
                      onPress={() => openTimePicker(entry.id, 'endTime')}
                    >
                      <Text style={{ color: entry.endTime ? '#1E293B' : '#999', textAlign: 'center' }}>
                        {entry.endTime || 'HH:MM'}
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.inputFixed, { width: 55 }]}
                      placeholder="0.0"
                      placeholderTextColor="#999"
                      value={entry.flowRate}
                      onChangeText={(value) => updateEntry(entry.id, 'flowRate', value)}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.calculatedValue, { width: 80 }]}> 
                      {minutes > 0 ? minutes : '-'}
                    </Text>
                    <Text style={[styles.calculatedValue, { width: 80 }]}> 
                      {cost > 0 ? `${cost.toFixed(2)}` : '-'}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => removeEntry(entry.id)}
                    >
                      <MaterialCommunityIcons name="delete" size={18} color="#D32F2F" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          {timePicker.visible && (
            <DateTimePicker
              value={timePicker.date || new Date()}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a Pagar</Text>
            <Text style={styles.totalAmount}>${totalCost.toFixed(2)}</Text>
            <Text style={styles.totalInfo}>
              Factor aplicado: {paymentFactor} ({insuranceType})
            </Text>
            <TouchableOpacity style={styles.shareButton} onPress={shareViaWhatsApp}>
              <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Compartir por WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <TimePickerModal
        visible={webTimePickerVisible}
        value={webTimePickerDate}
        onConfirm={(selectedDate) => {
          const formatted = formatDateToTime(selectedDate);
          if (webTimePickerEntry.entryId && webTimePickerEntry.field) {
            updateEntry(webTimePickerEntry.entryId, webTimePickerEntry.field, formatted);
          }
          setWebTimePickerVisible(false);
        }}
        onCancel={() => setWebTimePickerVisible(false)}
      />
    </View>
  );
}


