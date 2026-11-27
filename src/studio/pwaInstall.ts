export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaState {
  isInstalled: boolean;
  isStandaloneFile: boolean;
  canPromptInstall: boolean;
  isOnline: boolean;
  isIOS: boolean;
}

export class PwaInstallController {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private listeners: Array<(state: PwaState) => void> = [];

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.emit();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.emit();
    });

    window.addEventListener('online', () => this.emit());
    window.addEventListener('offline', () => this.emit());

    this.registerServiceWorker();
  }

  private registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (window.location.protocol === 'file:') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // ignore registration issues in restricted sandboxes
    });
  }

  public getState(): PwaState {
    if (typeof window === 'undefined') {
      return {
        isInstalled: false,
        isStandaloneFile: false,
        canPromptInstall: false,
        isOnline: true,
        isIOS: false,
      };
    }

    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const isStandaloneFile =
      window.location.protocol === 'file:' ||
      Boolean((window as unknown as { __KAS_STANDALONE_OFFLINE__?: boolean }).__KAS_STANDALONE_OFFLINE__);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);

    return {
      isInstalled: isStandaloneDisplay,
      isStandaloneFile,
      canPromptInstall: Boolean(this.deferredPrompt),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isIOS,
    };
  }

  public subscribe(fn: (state: PwaState) => void): void {
    this.listeners.push(fn);
    fn(this.getState());
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) return 'unavailable';
    await this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      this.deferredPrompt = null;
    }
    this.emit();
    return choice.outcome;
  }
}
