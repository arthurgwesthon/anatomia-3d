import { Component } from 'react'
import { Html } from '@react-three/drei'

/** Mostra um aviso dentro do canvas se um sistema não carregar. */
export default class ModelErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Html center>
        <div className="model-error">
          <strong>Não consegui carregar: {this.props.label}</strong>
          <p>{String(this.state.error.message ?? this.state.error)}</p>
        </div>
      </Html>
    )
  }
}
