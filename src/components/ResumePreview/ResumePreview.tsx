import styles from './ResumePreview.module.scss'

const Preview: React.FC = () => {
  return (
    <div className={styles.preview}>
      <h2>Live Preview</h2>
      <p>Your resume will appear here.</p>
    </div>
  )
}

export default Preview
