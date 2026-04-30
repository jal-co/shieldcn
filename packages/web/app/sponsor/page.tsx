import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import { pageMetadata } from "@/lib/metadata"
import Link from "next/link"
import { Heart, ExternalLink, Star, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"

function ShadcnCraftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 198 34" fill="currentColor" aria-hidden="true" className={className}>
      {/* Wordmark */}
      <path d="M194.477 27.3823C192.833 27.3823 191.621 27.0022 190.84 26.242C190.08 25.4817 189.7 24.29 189.7 22.6668V7.07178H193.645V22.297C193.645 23.0572 193.809 23.5914 194.138 23.8996C194.466 24.1873 194.98 24.3311 195.679 24.3311H197.99V27.3823H194.477ZM187.12 14.407V11.3558H198V14.407H187.12Z" />
      <path d="M179.237 27.3824V10.2771C179.237 8.79777 179.648 7.63687 180.47 6.79445C181.312 5.93148 182.596 5.5 184.322 5.5H187.528V8.55121H185.062C184.425 8.55121 183.952 8.71558 183.644 9.04433C183.357 9.37308 183.213 9.85593 183.213 10.4929V27.3824H179.237ZM176.895 14.4071V11.3559H187.312V14.4071H176.895Z" />
      <path d="M167.162 27.7524C165.436 27.7524 164.049 27.362 163.001 26.5812C161.953 25.7799 161.429 24.6704 161.429 23.2526C161.429 21.8349 161.871 20.7254 162.755 19.924C163.638 19.1227 164.984 18.5474 166.792 18.1981L172.247 17.1194C172.247 15.9482 171.98 15.075 171.446 14.4997C170.912 13.9038 170.121 13.6059 169.073 13.6059C168.128 13.6059 167.378 13.8319 166.823 14.2839C166.289 14.7154 165.919 15.3421 165.713 16.164L161.707 15.9791C162.036 14.2326 162.837 12.897 164.111 11.9724C165.385 11.0273 167.039 10.5547 169.073 10.5547C171.415 10.5547 173.182 11.1505 174.374 12.3423C175.586 13.5134 176.192 15.1983 176.192 17.3968V23.3759C176.192 23.8074 176.264 24.1053 176.408 24.2697C176.572 24.4341 176.809 24.5163 177.117 24.5163H177.641V27.3825C177.518 27.4236 177.312 27.4545 177.024 27.475C176.757 27.4956 176.48 27.5058 176.192 27.5058C175.514 27.5058 174.908 27.4031 174.374 27.1976C173.84 26.9716 173.429 26.5915 173.141 26.0573C172.853 25.5025 172.71 24.7525 172.71 23.8074L173.049 24.054C172.884 24.7731 172.525 25.4203 171.97 25.9956C171.436 26.5504 170.758 26.9819 169.936 27.2901C169.114 27.5983 168.189 27.7524 167.162 27.7524ZM167.963 24.8861C168.847 24.8861 169.607 24.7115 170.244 24.3622C170.881 24.0129 171.374 23.53 171.723 22.9136C172.073 22.2972 172.247 21.5678 172.247 20.7254V19.8008L167.994 20.6637C167.111 20.8487 166.474 21.126 166.083 21.4959C165.713 21.8452 165.529 22.3075 165.529 22.8828C165.529 23.5197 165.734 24.0129 166.145 24.3622C166.576 24.7115 167.183 24.8861 167.963 24.8861Z" />
      <path d="M152.737 27.3828V10.9248H156.435L156.589 15.4862L156.25 15.4246C156.497 13.8424 156.959 12.7021 157.637 12.0035C158.336 11.2844 159.281 10.9248 160.473 10.9248H161.983V14.315H160.442C159.599 14.315 158.901 14.4383 158.346 14.6849C157.791 14.9314 157.37 15.3218 157.082 15.856C156.815 16.3697 156.682 17.0478 156.682 17.8902V27.3828H152.737Z" />
      <path d="M144.159 27.7524C142.515 27.7524 141.087 27.4031 139.875 26.7045C138.663 25.9854 137.717 24.9786 137.039 23.6841C136.382 22.3897 136.053 20.8795 136.053 19.1535C136.053 17.4276 136.382 15.9277 137.039 14.6538C137.717 13.3593 138.663 12.3525 139.875 11.6334C141.087 10.9143 142.515 10.5547 144.159 10.5547C145.556 10.5547 146.799 10.8012 147.888 11.2944C148.977 11.7875 149.861 12.4964 150.539 13.421C151.237 14.325 151.669 15.4346 151.833 16.7496L147.765 16.9653C147.601 15.9174 147.19 15.1264 146.532 14.5921C145.895 14.0374 145.104 13.76 144.159 13.76C142.885 13.76 141.899 14.2428 141.2 15.2085C140.502 16.1537 140.152 17.4687 140.152 19.1535C140.152 20.8589 140.502 22.1842 141.2 23.1293C141.899 24.0745 142.885 24.5471 144.159 24.5471C145.125 24.5471 145.926 24.2697 146.563 23.7149C147.22 23.1602 147.621 22.2972 147.765 21.126L151.833 21.311C151.669 22.626 151.248 23.7663 150.57 24.732C149.892 25.6977 149.008 26.4477 147.919 26.9819C146.83 27.4956 145.577 27.7524 144.159 27.7524Z" />
      <path d="M120.739 27.3825V10.9245H124.314L124.468 15.5476L124.006 15.3626C124.17 14.212 124.509 13.2874 125.023 12.5888C125.536 11.8902 126.163 11.3766 126.903 11.0478C127.643 10.7191 128.454 10.5547 129.338 10.5547C130.55 10.5547 131.567 10.8218 132.389 11.356C133.231 11.8902 133.868 12.6299 134.3 13.5751C134.731 14.4997 134.947 15.5784 134.947 16.8112V27.3825H131.002V18.0748C131.002 17.1502 130.909 16.3694 130.725 15.7325C130.54 15.0955 130.231 14.6127 129.8 14.2839C129.389 13.9346 128.834 13.76 128.136 13.76C127.088 13.76 126.245 14.1298 125.608 14.8695C124.992 15.6092 124.684 16.6776 124.684 18.0748V27.3825H120.739Z" />
      <path d="M112.162 27.7524C110.518 27.7524 109.09 27.4031 107.878 26.7045C106.665 25.9854 105.72 24.9786 105.042 23.6841C104.385 22.3897 104.056 20.8795 104.056 19.1535C104.056 17.4276 104.385 15.9277 105.042 14.6538C105.72 13.3593 106.665 12.3525 107.878 11.6334C109.09 10.9143 110.518 10.5547 112.162 10.5547C113.559 10.5547 114.802 10.8012 115.891 11.2944C116.98 11.7875 117.863 12.4964 118.541 13.421C119.24 14.325 119.671 15.4346 119.836 16.7496L115.768 16.9653C115.603 15.9174 115.192 15.1264 114.535 14.5921C113.898 14.0374 113.107 13.76 112.162 13.76C110.888 13.76 109.902 14.2428 109.203 15.2085C108.504 16.1537 108.155 17.4687 108.155 19.1535C108.155 20.8589 108.504 22.1842 109.203 23.1293C109.902 24.0745 110.888 24.5471 112.162 24.5471C113.127 24.5471 113.929 24.2697 114.566 23.7149C115.223 23.1602 115.624 22.2972 115.768 21.126L119.836 21.311C119.671 22.626 119.25 23.7663 118.572 24.732C117.894 25.6977 117.011 26.4477 115.922 26.9819C114.833 27.4956 113.579 27.7524 112.162 27.7524Z" />
      <path d="M93.8748 27.7522C92.4776 27.7522 91.2653 27.4029 90.238 26.7043C89.2312 26.0057 88.4504 25.0092 87.8956 23.7148C87.3409 22.4203 87.0635 20.8999 87.0635 19.1534C87.0635 17.4069 87.3409 15.8864 87.8956 14.592C88.4504 13.2975 89.2414 12.301 90.2688 11.6024C91.2961 10.9038 92.4981 10.5545 93.8748 10.5545C95.0254 10.5545 96.0322 10.7908 96.8951 11.2634C97.7786 11.736 98.4464 12.4037 98.8984 13.2667V5.5H102.843V27.3824H99.0834L98.9909 24.9476C98.5389 25.8311 97.8608 26.5194 96.9568 27.0125C96.0527 27.5057 95.0254 27.7522 93.8748 27.7522ZM95.0767 24.5469C95.8986 24.5469 96.5869 24.3414 97.1417 23.9305C97.717 23.5196 98.1485 22.9134 98.4361 22.1121C98.7443 21.2902 98.8984 20.304 98.8984 19.1534C98.8984 17.9822 98.7443 16.996 98.4361 16.1946C98.1485 15.3933 97.717 14.7872 97.1417 14.3762C96.5869 13.9653 95.8986 13.7598 95.0767 13.7598C93.885 13.7598 92.9296 14.2427 92.2105 15.2084C91.5119 16.1535 91.1626 17.4685 91.1626 19.1534C91.1626 20.7971 91.5119 22.1121 92.2105 23.0984C92.9296 24.0641 93.885 24.5469 95.0767 24.5469Z" />
      <path d="M77.008 27.7524C75.282 27.7524 73.8951 27.362 72.8472 26.5812C71.7993 25.7799 71.2754 24.6704 71.2754 23.2526C71.2754 21.8349 71.7171 20.7254 72.6007 19.924C73.4842 19.1227 74.83 18.5474 76.6381 18.1981L82.0933 17.1194C82.0933 15.9482 81.8262 15.075 81.292 14.4997C80.7578 13.9038 79.9667 13.6059 78.9188 13.6059C77.9737 13.6059 77.2237 13.8319 76.6689 14.2839C76.1347 14.7154 75.7649 15.3421 75.5594 16.164L71.5528 15.9791C71.8815 14.2326 72.6828 12.897 73.9568 11.9724C75.2307 11.0273 76.8847 10.5547 78.9188 10.5547C81.2612 10.5547 83.0282 11.1505 84.2199 12.3423C85.4322 13.5134 86.0383 15.1983 86.0383 17.3968V23.3759C86.0383 23.8074 86.1102 24.1053 86.254 24.2697C86.4184 24.4341 86.6547 24.5163 86.9629 24.5163H87.4868V27.3825C87.3636 27.4236 87.1581 27.4545 86.8704 27.475C86.6033 27.4956 86.3259 27.5058 86.0383 27.5058C85.3602 27.5058 84.7541 27.4031 84.2199 27.1976C83.6857 26.9716 83.2747 26.5915 82.9871 26.0573C82.6994 25.5025 82.5556 24.7525 82.5556 23.8074L82.8946 24.054C82.7302 24.7731 82.3707 25.4203 81.8159 25.9956C81.2817 26.5504 80.6037 26.9819 79.7818 27.2901C78.9599 27.5983 78.0353 27.7524 77.008 27.7524ZM77.8093 24.8861C78.6928 24.8861 79.453 24.7115 80.09 24.3622C80.7269 24.0129 81.2201 23.53 81.5694 22.9136C81.9187 22.2972 82.0933 21.5678 82.0933 20.7254V19.8008L77.8401 20.6637C76.9566 20.8487 76.3196 21.126 75.9292 21.4959C75.5594 21.8452 75.3745 22.3075 75.3745 22.8828C75.3745 23.5197 75.58 24.0129 75.9909 24.3622C76.4224 24.7115 77.0285 24.8861 77.8093 24.8861Z" />
      <path d="M55.9309 27.3824V5.5H59.8759V14.6844H59.3828C59.5472 13.7393 59.8759 12.9688 60.369 12.3729C60.8621 11.7565 61.4683 11.3045 62.1874 11.0168C62.9066 10.7086 63.6976 10.5545 64.5606 10.5545C65.7728 10.5545 66.7899 10.8216 67.6118 11.3559C68.4542 11.8695 69.0809 12.5989 69.4918 13.5441C69.9233 14.4892 70.139 15.5782 70.139 16.811V27.3824H66.1941V17.7665C66.1941 16.4309 65.968 15.4344 65.516 14.7769C65.064 14.0989 64.3551 13.7598 63.3894 13.7598C62.321 13.7598 61.4683 14.1091 60.8313 14.8077C60.1944 15.5063 59.8759 16.5234 59.8759 17.8589V27.3824H55.9309Z" />
      <path d="M47.6434 27.7524C46.0202 27.7524 44.6539 27.5161 43.5443 27.0435C42.4553 26.5709 41.6129 25.9134 41.0171 25.071C40.4212 24.2286 40.0822 23.2732 40 22.2047L44.0374 22.0198C44.1813 22.8828 44.5408 23.5506 45.1162 24.0231C45.6915 24.4957 46.5442 24.732 47.6742 24.732C48.5989 24.732 49.318 24.5882 49.8317 24.3005C50.3659 23.9923 50.633 23.5197 50.633 22.8828C50.633 22.5129 50.5405 22.2047 50.3556 21.9582C50.1707 21.7116 49.8214 21.4959 49.3077 21.311C48.7941 21.126 48.0338 20.9411 47.027 20.7562C45.3422 20.4685 44.0169 20.1192 43.0512 19.7083C42.0855 19.2768 41.3972 18.7426 40.9862 18.1056C40.5959 17.4687 40.4007 16.6776 40.4007 15.7325C40.4007 14.1915 40.9862 12.9484 42.1574 12.0032C43.3491 11.0375 45.0853 10.5547 47.366 10.5547C48.8454 10.5547 50.0885 10.8012 51.0953 11.2944C52.1021 11.7669 52.8829 12.4244 53.4376 13.2669C54.0129 14.0887 54.3725 15.0339 54.5163 16.1023L50.5405 16.2873C50.4378 15.7325 50.2529 15.2496 49.9858 14.8387C49.7186 14.4278 49.3591 14.1196 48.9071 13.9141C48.455 13.6881 47.9208 13.5751 47.3044 13.5751C46.3798 13.5751 45.6812 13.76 45.2086 14.1298C44.7361 14.4997 44.4998 14.9928 44.4998 15.6092C44.4998 16.0407 44.6025 16.4003 44.808 16.6879C45.034 16.9756 45.3935 17.2119 45.8867 17.3968C46.3798 17.5612 47.0373 17.7153 47.8592 17.8591C49.5851 18.1262 50.9412 18.4755 51.9274 18.907C52.9342 19.3179 53.6431 19.8521 54.054 20.5096C54.4855 21.1466 54.7013 21.9171 54.7013 22.8211C54.7013 23.869 54.4033 24.7628 53.8075 25.5025C53.2322 26.2422 52.4103 26.8072 51.3419 27.1976C50.294 27.5675 49.0612 27.7524 47.6434 27.7524Z" />
      {/* Icon mark */}
      <path d="M28.471 6.70632V12.7521H14.2475L10.3956 19.2266C10.2449 19.4812 9.9719 19.6352 9.67547 19.6352H6.36453C5.9023 19.6352 5.52716 19.2601 5.52716 18.7979V12.7521H13.6329L16.9957 7.09653C17.4479 6.33453 18.2685 5.86896 19.1545 5.86896H27.6336C28.0958 5.86896 28.471 6.2441 28.471 6.70632Z" />
      <path d="M5.52723 27.2932V21.2474H19.7507L23.6026 14.7729C23.7533 14.5184 24.0263 14.3643 24.3227 14.3643H27.6354C28.0976 14.3643 28.4727 14.7394 28.4727 15.2017V21.2474H20.367L17.0042 26.903C16.552 27.665 15.7314 28.1306 14.8454 28.1306H6.36459C5.90237 28.1306 5.52723 27.7554 5.52723 27.2932Z" />
    </svg>
  )
}

function OpenPanelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="55 28 210 42" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M104.374 36.542a5.173 5.173 0 1 0-10.347 0V60.42a5.174 5.174 0 1 0 10.347 0zM120.293 36.542a5.174 5.174 0 1 0-10.347 0v7.163a5.173 5.173 0 1 0 10.347 0z" />
      <path d="M74.212 31C66.362 31 60 37.363 60 45.212v5.808c0 7.85 6.363 14.212 14.212 14.212 7.85 0 14.212-6.363 14.212-14.212v-5.808c0-7.85-6.363-14.212-14.212-14.212m.026 8.36a5.174 5.174 0 0 0-5.174 5.174v7.163a5.174 5.174 0 1 0 10.348 0v-7.163a5.174 5.174 0 0 0-5.174-5.174" fillRule="evenodd" clipRule="evenodd" />
      <path d="M146 57.384q-2.472 0-4.248-1.056-1.776-1.08-2.736-3.072t-.96-4.752.96-4.752q.96-2.016 2.736-3.096t4.248-1.08q2.496 0 4.272 1.08 1.8 1.08 2.736 3.096.96 1.992.96 4.752t-.96 4.752q-.936 1.992-2.736 3.072-1.776 1.056-4.272 1.056m0-2.376q1.656 0 2.832-.768 1.2-.768 1.824-2.208.624-1.464.624-3.528t-.624-3.528-1.824-2.232q-1.176-.792-2.832-.792-1.632 0-2.808.792-1.176.768-1.824 2.232-.624 1.464-.624 3.528t.624 3.528q.648 1.44 1.824 2.208t2.808.768m10.823 5.592V44.232h2.4l.072 2.736-.288-.144q.48-1.416 1.584-2.136 1.104-.744 2.544-.744 1.872 0 3.072.936 1.224.912 1.8 2.424.6 1.512.6 3.312t-.6 3.312q-.576 1.512-1.8 2.448-1.2.912-3.072.912-.96 0-1.8-.336a4.2 4.2 0 0 1-1.44-.936 3.6 3.6 0 0 1-.816-1.464l.288-.288V60.6zm5.856-5.52q1.536 0 2.4-1.176.888-1.176.888-3.288t-.888-3.288q-.864-1.176-2.4-1.176-1.008 0-1.752.504-.744.48-1.152 1.488t-.408 2.472.384 2.472q.408 1.008 1.152 1.512.768.48 1.776.48m13.768 2.208q-1.872 0-3.24-.816-1.344-.816-2.088-2.328-.72-1.512-.72-3.528t.72-3.504q.744-1.512 2.088-2.328 1.344-.84 3.168-.84 1.728 0 3.048.816 1.32.792 2.04 2.304.744 1.512.744 3.648v.648h-9.168q.096 1.872.984 2.808.912.936 2.448.936 1.128 0 1.872-.528t1.032-1.416l2.64.168a5.3 5.3 0 0 1-1.992 2.88q-1.464 1.08-3.576 1.08m-3.408-7.848h6.48q-.12-1.704-.984-2.52-.84-.816-2.16-.816-1.368 0-2.256.864-.864.84-1.08 2.472M184.784 57V44.232h2.328l.096 3.408-.312-.168q.216-1.248.816-2.016t1.464-1.128a4.6 4.6 0 0 1 1.872-.384q1.44 0 2.376.648.96.624 1.44 1.728.504 1.08.504 2.472V57h-2.544v-7.44q0-1.128-.24-1.896t-.792-1.176-1.44-.408q-1.344 0-2.184.888t-.84 2.592V57zm14.21 0V39.96h6.36q2.928 0 4.56 1.416 1.632 1.392 1.632 3.888 0 1.656-.744 2.88-.744 1.2-2.136 1.848-1.368.624-3.312.624h-3.768V57zm2.592-8.736h3.696q1.752 0 2.664-.744.912-.768.912-2.256 0-1.464-.912-2.184-.912-.744-2.664-.744h-3.696zm15.954 9.024q-1.992 0-3.192-.912-1.176-.912-1.176-2.568t.984-2.568q1.008-.936 3.096-1.344l4.392-.84q0-1.488-.696-2.208-.696-.744-2.064-.744-1.224 0-1.92.552-.696.528-.96 1.584l-2.616-.168q.36-1.92 1.776-3.024 1.44-1.104 3.72-1.104 2.592 0 3.936 1.392 1.368 1.368 1.368 3.864v4.968q0 .456.144.648.168.168.528.168h.456V57q-.12.024-.384.048t-.552.024q-.816 0-1.416-.264a1.75 1.75 0 0 1-.864-.864q-.288-.624-.288-1.656l.264.12a3.03 3.03 0 0 1-.84 1.488q-.624.648-1.608 1.032a5.9 5.9 0 0 1-2.088.36m.408-2.016q1.152 0 1.968-.432.816-.456 1.272-1.248t.456-1.8v-.816l-3.744.72q-1.152.216-1.632.696-.456.456-.456 1.176 0 .816.552 1.272.576.432 1.584.432M227.464 57V44.232h2.328l.096 3.408-.312-.168q.216-1.248.816-2.016t1.464-1.128a4.6 4.6 0 0 1 1.872-.384q1.44 0 2.376.648.96.624 1.44 1.728.504 1.08.504 2.472V57h-2.544v-7.44q0-1.128-.24-1.896t-.792-1.176-1.44-.408q-1.344 0-2.184.888t-.84 2.592V57zm19.154.288q-1.87 0-3.239-.816-1.344-.816-2.088-2.328-.72-1.512-.72-3.528t.72-3.504q.744-1.512 2.088-2.328 1.344-.84 3.168-.84 1.728 0 3.048.816 1.32.792 2.04 2.304.744 1.512.744 3.648v.648h-9.168q.096 1.872.984 2.808.912.936 2.448.936 1.128 0 1.872-.528t1.032-1.416l2.64.168a5.3 5.3 0 0 1-1.992 2.88q-1.464 1.08-3.577 1.08m-3.407-7.848h6.48q-.12-1.704-.984-2.52-.84-.816-2.16-.816-1.368 0-2.256.864-.864.84-1.08 2.472M257.857 57q-1.248 0-2.016-.648t-.768-2.064V39.96h2.544v14.088q0 .432.216.648.24.216.672.216h1.008V57z" />
    </svg>
  )
}

interface Sponsor {
  name: string
  href: string
  logo?: string
  logoComponent?: ReactNode
}

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Sponsor",
    description:
      "Support shieldcn — free, open-source README badges for everyone. Sponsor tiers, stargazers, and how to contribute.",
    path: "/sponsor",
  }),
}

const GITHUB_SPONSORS_URL = "https://github.com/sponsors/jal-co"

interface Stargazer {
  login: string
  avatar_url: string
}

async function getStargazers(): Promise<Stargazer[]> {
  const pages: Stargazer[] = []
  let page = 1
  while (page <= 5) {
    const res = await fetch(
      `https://api.github.com/repos/jal-co/shieldcn/stargazers?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) break
    const data: Stargazer[] = await res.json()
    if (data.length === 0) break
    pages.push(...data)
    if (data.length < 100) break
    page++
  }
  return pages.filter((s) => s.login !== "jal-co")
}

const tiers = [
  {
    name: "Open Source Program",
    slots: 4,
    sponsors: [
      {
        name: "OpenPanel",
        href: "https://openpanel.dev/open-source?utm_source=shieldcn.dev",
        logoComponent: <OpenPanelLogo className="h-8 w-auto" />,
      },
    ] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #22c55e 0%, #4ade80 30%, #16a34a 60%, #86efac 100%)",
      text: "#052e16",
      border: "#16a34a",
      slotBg: "rgba(34, 197, 94, 0.06)",
      slotBorder: "rgba(22, 163, 74, 0.2)",
    },
  },
  {
    name: "Gold",
    slots: 3,
    sponsors: [
      {
        name: "shadcncraft",
        href: "https://shadcncraft.com?utm_source=shieldcn.dev",
        logoComponent: <ShadcnCraftLogo className="h-8 w-auto" />,
      },
    ] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #d4a84b 0%, #f5d98a 30%, #c9952e 60%, #e8c55a 100%)",
      text: "#5c3d0e",
      border: "#c9952e",
      slotBg: "rgba(212, 168, 75, 0.08)",
      slotBorder: "rgba(201, 149, 46, 0.25)",
    },
  },
  {
    name: "Silver",
    slots: 3,
    sponsors: [] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #a8a8a8 0%, #d4d4d4 30%, #8a8a8a 60%, #c0c0c0 100%)",
      text: "#2a2a2a",
      border: "#8a8a8a",
      slotBg: "rgba(168, 168, 168, 0.06)",
      slotBorder: "rgba(138, 138, 138, 0.2)",
    },
  },
  {
    name: "Bronze",
    slots: 4,
    sponsors: [] as Sponsor[],
    colors: {
      bg: "linear-gradient(145deg, #b5745a 0%, #d4956e 30%, #8c5a3e 60%, #c98a68 100%)",
      text: "#3d1e0e",
      border: "#8c5a3e",
      slotBg: "rgba(181, 116, 90, 0.06)",
      slotBorder: "rgba(140, 90, 62, 0.2)",
    },
  },
]

export default async function SponsorPage() {
  const stargazers = await getStargazers()

  return (
    <SiteShell>
      <main className="min-w-0 flex-1 flex items-start justify-center">
        <div
          className="hidden w-4 shrink-0 self-stretch border-l border-dashed border-border md:block"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 3.5px), var(--background)",
          }}
        />

        <div className="flex w-full max-w-3xl flex-col border-x border-dashed border-border bg-background">
          {/* Hero */}
          <section className="flex flex-col gap-6 border-b px-6 py-14 sm:px-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Heart className="size-3.5" />
                Sponsor
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                I&apos;ll never charge, but if you want to help
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                shieldcn is an open source badge service built on the shadcn/ui
                design language. Every badge endpoint is free and that&apos;s not
                changing.
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                I&apos;m not going to paywall features or gate badge types behind
                a sponsorship tier. But if shieldcn made your README look
                better, or you just like that this exists in the open,
                sponsoring is a nice way to say so. It helps me justify spending
                real time on it instead of treating it like a side-of-desk thing.
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Any amount is genuinely appreciated. And if money&apos;s not your
                thing, starring the repo or sharing a badge you liked works too.
              </p>
            </div>

            <a
              href={GITHUB_SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="gap-2">
                <Heart className="size-4" />
                Sponsor on GitHub
                <ExternalLink className="size-3.5 opacity-60" />
              </Button>
            </a>
          </section>

          {/* Sponsor tiers */}
          <section className="flex flex-col">
            {tiers.map((tier) => {
              const filled = tier.sponsors.length
              const empty = tier.slots - filled

              return (
                <div key={tier.name} className="flex flex-col gap-3 border-b px-6 py-6 sm:px-10">
                  <div
                    className="relative flex items-center justify-center rounded-md px-8 py-2.5"
                    style={{
                      background: tier.colors.bg,
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.12)",
                    }}
                  >
                    {["left-2.5 top-1/2 -translate-y-1/2", "right-2.5 top-1/2 -translate-y-1/2"].map((pos) => (
                      <span
                        key={pos}
                        className={`absolute size-2 rounded-full ${pos}`}
                        style={{
                          background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5), transparent 50%), ${tier.colors.bg}`,
                          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.2), 0 1px 1px rgba(255,255,255,0.15)",
                          border: "1px solid rgba(0,0,0,0.15)",
                        }}
                      />
                    ))}
                    <h3
                      className="text-xs font-extrabold uppercase tracking-[0.2em]"
                      style={{ color: tier.colors.text }}
                    >
                      {tier.name}
                    </h3>
                  </div>

                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${Math.min(tier.slots, 4)}, 1fr)` }}
                  >
                    {tier.sponsors.map((sponsor) => (
                      <a
                        key={sponsor.name}
                        href={sponsor.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center rounded-md border p-6 transition-all hover:scale-[1.02]"
                        style={{ backgroundColor: tier.colors.slotBg, borderColor: tier.colors.slotBorder }}
                      >
                        {sponsor.logoComponent ? (
                          <div className="text-foreground/70 transition-colors group-hover:text-foreground">
                            {sponsor.logoComponent}
                          </div>
                        ) : sponsor.logo ? (
                          <Image
                            src={sponsor.logo}
                            alt={sponsor.name}
                            width={120}
                            height={32}
                            className="h-8 w-auto opacity-60 transition-opacity group-hover:opacity-100"
                            unoptimized
                          />
                        ) : (
                          <span className="text-sm font-medium text-foreground">{sponsor.name}</span>
                        )}
                      </a>
                    ))}

                    {Array.from({ length: empty }).map((_, i) => (
                      <a
                        key={`empty-${tier.name}-${i}`}
                        href={GITHUB_SPONSORS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded-md border border-dashed p-8 transition-all hover:scale-[1.02]"
                        style={{ borderColor: tier.colors.slotBorder }}
                      >
                        <Plus className="size-5" style={{ color: tier.colors.border, opacity: 0.5 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          {/* Stargazers */}
          {stargazers.length > 0 && (
            <section className="flex flex-col border-b">
              <div className="flex items-center gap-3 px-6 py-3 sm:px-10">
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                  Stargazers
                </h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {stargazers.length}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-0 border-t py-4">
                {stargazers.map((user) => (
                  <a
                    key={user.login}
                    href={`https://github.com/${user.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={user.login}
                    className="group relative p-1.5 transition-colors hover:bg-accent/50"
                  >
                    <Image
                      src={user.avatar_url}
                      alt={user.login}
                      width={36}
                      height={36}
                      className="rounded-full ring-1 ring-border transition-all group-hover:ring-foreground/30 group-hover:scale-110"
                      unoptimized
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="flex flex-col items-center gap-5 px-6 py-14 sm:px-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-lg font-bold tracking-tight">
                Want to support the project?
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Every bit helps — whether it&apos;s a sponsorship, a star, or sharing
                something you found useful.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a href={GITHUB_SPONSORS_URL} target="_blank" rel="noopener noreferrer">
                <Button size="default" className="gap-2">
                  <Heart className="size-4" />
                  Become a Sponsor
                </Button>
              </a>
              <a href="https://github.com/jal-co/shieldcn" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="default" className="gap-2">
                  <Star className="size-4" />
                  Star on GitHub
                </Button>
              </a>
            </div>
          </section>
        </div>

        <div
          className="hidden w-4 shrink-0 self-stretch border-r border-dashed border-border md:block"
          style={{
            background:
              "repeating-linear-gradient(45deg, transparent, transparent 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 2px, color-mix(in oklab, var(--color-border) 60%, transparent) 3.5px), var(--background)",
          }}
        />
      </main>
    </SiteShell>
  )
}
