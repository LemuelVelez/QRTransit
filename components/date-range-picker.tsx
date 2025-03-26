"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface DateRangePickerProps {
    visible: boolean
    startDate: Date | null
    endDate: Date | null
    onSelectDates: (startDate: Date | null, endDate: Date | null) => void
    onCancel: () => void
}

export default function DateRangePicker({
    visible,
    startDate,
    endDate,
    onSelectDates,
    onCancel,
}: DateRangePickerProps) {
    const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate)
    const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectingStart, setSelectingStart] = useState(true)

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay()
    }

    const renderCalendar = () => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        const daysInMonth = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)

        const days = []

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i))
        }

        // Create weeks array
        const weeks = []
        let week = []

        for (let i = 0; i < days.length; i++) {
            week.push(days[i])

            if (week.length === 7 || i === days.length - 1) {
                // Fill the last week with nulls if needed
                while (week.length < 7) {
                    week.push(null)
                }

                weeks.push(week)
                week = []
            }
        }

        return weeks
    }

    const isDateInRange = (date: Date) => {
        if (!tempStartDate) return false
        if (!tempEndDate) return date.getTime() === tempStartDate.getTime()

        return date >= tempStartDate && date <= tempEndDate
    }

    const isStartDate = (date: Date) => {
        return tempStartDate && date.getTime() === tempStartDate.getTime()
    }

    const isEndDate = (date: Date) => {
        return tempEndDate && date.getTime() === tempEndDate.getTime()
    }

    const handleDateSelect = (date: Date) => {
        if (selectingStart) {
            setTempStartDate(date)
            setTempEndDate(null)
            setSelectingStart(false)
        } else {
            if (date < tempStartDate!) {
                // If selected date is before start date, swap them
                setTempEndDate(tempStartDate)
                setTempStartDate(date)
            } else {
                setTempEndDate(date)
            }
            setSelectingStart(true)
        }
    }

    const handlePrevMonth = () => {
        const newMonth = new Date(currentMonth)
        newMonth.setMonth(newMonth.getMonth() - 1)
        setCurrentMonth(newMonth)
    }

    const handleNextMonth = () => {
        const newMonth = new Date(currentMonth)
        newMonth.setMonth(newMonth.getMonth() + 1)
        setCurrentMonth(newMonth)
    }

    const handleApply = () => {
        onSelectDates(tempStartDate, tempEndDate)
    }

    const handleClear = () => {
        setTempStartDate(null)
        setTempEndDate(null)
        setSelectingStart(true)
    }

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ]

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-white w-[90%] max-w-md rounded-xl p-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-gray-800">Select Date Range</Text>
                        <TouchableOpacity onPress={onCancel}>
                            <Ionicons name="close" size={24} color="#059669" />
                        </TouchableOpacity>
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-600 mb-1">{selectingStart ? "Select start date" : "Select end date"}</Text>
                        <View className="flex-row justify-between">
                            <Text className="font-medium">
                                Start: {tempStartDate ? tempStartDate.toLocaleDateString() : "Not set"}
                            </Text>
                            <Text className="font-medium">End: {tempEndDate ? tempEndDate.toLocaleDateString() : "Not set"}</Text>
                        </View>
                    </View>

                    <View className="border-t border-gray-200 pt-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <TouchableOpacity onPress={handlePrevMonth}>
                                <Ionicons name="chevron-back" size={24} color="#059669" />
                            </TouchableOpacity>
                            <Text className="text-lg font-medium">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </Text>
                            <TouchableOpacity onPress={handleNextMonth}>
                                <Ionicons name="chevron-forward" size={24} color="#059669" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row mb-2">
                            {dayNames.map((day, index) => (
                                <Text key={index} className="flex-1 text-center text-gray-500 font-medium">
                                    {day}
                                </Text>
                            ))}
                        </View>

                        {renderCalendar().map((week, weekIndex) => (
                            <View key={weekIndex} className="flex-row mb-2">
                                {week.map((day, dayIndex) => (
                                    <TouchableOpacity
                                        key={dayIndex}
                                        className={`flex-1 h-10 justify-center items-center rounded-full ${day && isDateInRange(day) ? "bg-emerald-100" : ""
                                            } ${day && (isStartDate(day) || isEndDate(day)) ? "bg-emerald-500" : ""}`}
                                        disabled={!day}
                                        onPress={() => day && handleDateSelect(day)}
                                    >
                                        {day && (
                                            <Text
                                                className={`${isStartDate(day) || isEndDate(day) ? "text-white" : "text-black"} font-medium`}
                                            >
                                                {day.getDate()}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </View>

                    <View className="flex-row justify-between mt-4">
                        <TouchableOpacity className="py-2 px-4 bg-gray-200 rounded-lg" onPress={handleClear}>
                            <Text className="font-medium">Clear</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="py-2 px-4 bg-emerald-500 rounded-lg"
                            onPress={handleApply}
                            disabled={!tempStartDate}
                        >
                            <Text className="font-medium text-white">Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

