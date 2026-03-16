import { motion } from 'framer-motion'

interface Props {
  options: string[]
  selected: string | null
  onSelect: (value: string) => void
}

export default function MultipleChoice({ options, selected, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full max-w-lg">
      {options.map((option, i) => (
        <motion.button
          key={option}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(option)}
          className={`px-5 py-4 rounded-2xl text-left text-base font-medium transition-all duration-200 border-2 cursor-pointer ${
            selected === option
              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-[1.02]'
              : 'bg-white/5 border-white/10 text-text-primary hover:bg-white/10 hover:border-white/20'
          }`}
        >
          {option}
        </motion.button>
      ))}
    </div>
  )
}
