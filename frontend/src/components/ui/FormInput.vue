<template>
  <div class="field">
    <label class="field-label">{{ label }}</label>
    <input
      :value="modelValue"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :class="['field-input', inputClass]"
      @input="handleInput"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  modelValue: string
  placeholder?: string
  type?: string
  maxlength?: number
  inputClass?: string
  uppercase?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function handleInput(e: Event) {
  let val = (e.target as HTMLInputElement).value
  if (props.uppercase) val = val.toUpperCase()
  emit('update:modelValue', val)
}
</script>

<style scoped>
@reference "tailwindcss";

.field {
  @apply space-y-1;
}
.field-label {
  @apply text-sm text-gray-400;
}
.field-input {
  @apply w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 outline-none
         focus:ring-2 focus:ring-blue-600 placeholder-gray-500;
}
</style>
