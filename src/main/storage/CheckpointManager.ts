import * as fs from 'fs';
import * as path from 'path';
import { CheckpointData } from '../../shared/types';

export class CheckpointManager {
  private checkpointPath: string;
  private checkpoint: CheckpointData | null = null;

  constructor(checkpointPath: string) {
    this.checkpointPath = checkpointPath;
    this.checkpoint = this.load();
  }

  load(): CheckpointData | null {
    if (!fs.existsSync(this.checkpointPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.checkpointPath, 'utf-8');
      this.checkpoint = JSON.parse(data);
      return this.checkpoint;
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      return null;
    }
  }

  save(data: CheckpointData): void {
    const dir = path.dirname(this.checkpointPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.checkpointPath, JSON.stringify(data, null, 2));
    this.checkpoint = data;
  }

  addCompleted(url: string, profileName: string): void {
    if (!this.checkpoint) {
      this.checkpoint = {
        timestamp: new Date().toISOString(),
        profileName,
        completed: [],
        pending: [],
        totalProducts: 0,
        successCount: 0,
        failCount: 0,
      };
    }

    if (!this.checkpoint.completed.includes(url)) {
      this.checkpoint.completed.push(url);
      this.checkpoint.successCount++;
      this.checkpoint.timestamp = new Date().toISOString();
      this.save(this.checkpoint);
    }
  }

  isCompleted(url: string): boolean {
    return this.checkpoint?.completed.includes(url) ?? false;
  }

  getCompleted(): string[] {
    return this.checkpoint?.completed ?? [];
  }

  reset(): void {
    this.checkpoint = null;
    if (fs.existsSync(this.checkpointPath)) {
      fs.unlinkSync(this.checkpointPath);
    }
  }
}
