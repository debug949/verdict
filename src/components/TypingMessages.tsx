'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'

const MESSAGES = ['Scanning diff...', 'CRITICAL · AWS key', 'Score: 0 / 100']
const TYPING_SPEED = 100
const DELETING_SPEED = 50
const PAUSE_BEFORE_DELETE = 2000

export function TypingMessages() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing')

  useEffect(() => {
    const current = MESSAGES[msgIndex]

    if (phase === 'typing') {
      if (displayed.length < current.length) {
        const t = setTimeout(
          () => setDisplayed(current.slice(0, displayed.length + 1)),
          TYPING_SPEED
        )
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('pausing'), PAUSE_BEFORE_DELETE)
        return () => clearTimeout(t)
      }
    }

    if (phase === 'pausing') {
      setPhase('deleting')
    }

    if (phase === 'deleting') {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), DELETING_SPEED)
        return () => clearTimeout(t)
      } else {
        setMsgIndex(i => (i + 1) % MESSAGES.length)
        setPhase('typing')
      }
    }
  }, [displayed, phase, msgIndex])

  return (
    <div className="lp-typing-wrap">
      <span className="lp-typing-text">
        {displayed}
        <motion.span
          className="lp-typing-cursor"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </span>
    </div>
  )
}
