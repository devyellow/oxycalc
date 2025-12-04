import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TimePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function TimePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: TimePickerModalProps) {
  const [hour, setHour] = useState(value.getHours() % 12 || 12);
  const [minute, setMinute] = useState(value.getMinutes());
  const [ampm, setAmpm] = useState(value.getHours() >= 12 ? 'PM' : 'AM');

  useEffect(() => {
    if (visible) {
      const h = value.getHours();
      setHour(h % 12 || 12);
      setMinute(value.getMinutes());
      setAmpm(h >= 12 ? 'PM' : 'AM');
    }
  }, [visible, value]);

  const handleConfirm = () => {
    let hours = hour;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const newDate = new Date(value);
    newDate.setHours(hours);
    newDate.setMinutes(minute);
    newDate.setSeconds(0);
    onConfirm(newDate);
  };

  if (Platform.OS !== 'web') {
    return null; // Use native picker for mobile
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Seleccionar Hora</Text>

          <View style={styles.pickers}>
            {/* Hour Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.label}>Hora</Text>
              <ScrollView
                style={styles.scroll}
                snapToInterval={44}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
              >
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.option, hour === h && styles.optionActive]}
                    onPress={() => setHour(h)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hour === h && styles.optionTextActive,
                      ]}
                    >
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minute Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.label}>Minuto</Text>
              <ScrollView
                style={styles.scroll}
                snapToInterval={44}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
              >
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.option, minute === m && styles.optionActive]}
                    onPress={() => setMinute(m)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        minute === m && styles.optionTextActive,
                      ]}
                    >
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM Picker */}
            <View style={styles.pickerColumn}>
              <Text style={styles.label}>AM/PM</Text>
              <View style={styles.ampmContainer}>
                {['AM', 'PM'].map((ap) => (
                  <TouchableOpacity
                    key={ap}
                    style={[styles.option, ampm === ap && styles.optionActive]}
                    onPress={() => setAmpm(ap)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        ampm === ap && styles.optionTextActive,
                      ]}
                    >
                      {ap}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Hora seleccionada:</Text>
            <Text style={styles.previewTime}>
              {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {ampm}
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.buttonCancel} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonConfirm} onPress={handleConfirm}>
              <Text style={styles.buttonTextConfirm}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  pickerColumn: {
    width: '30%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  scroll: {
    maxHeight: 200,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  optionActive: {
    backgroundColor: '#9575CD',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ampmContainer: {
    flexDirection: 'column',
  },
  preview: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#9575CD',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  buttonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  buttonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#9575CD',
  },
  buttonTextConfirm: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
