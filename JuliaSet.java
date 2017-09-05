import java.awt.*;
import java.awt.image.BufferedImage;
import javax.swing.*;
import java.awt.event.*;

public class JuliaSet extends JPanel implements MouseMotionListener, MouseListener, MouseWheelListener {
    private final int maxIter = 100;
    private static double zoom = 1;
    private static double cX;
    private static double cY;

    private double current = 1;

    private Point start;

    private static double offsetX = 0;
    private static double offsetY = 0;

    private static double dxOffset = 0;
    private static double dyOffset = 0;

    private static JFrame f;

    private static JPanel panel;
    private static JLabel equationLabel;
    private static JLabel aLabel;
    private static JTextField aField;
    private static JLabel bLabel;
    private static JTextField bField;
    private static JButton updateEquationButton;
    private static JLabel equationDisplay;

    private boolean debug = false;

    private void updateFrame() {
      revalidate();
      repaint();
    }

    public void mouseWheelMoved(MouseWheelEvent e) {
      if(debug) {
        System.out.println("scrolled: " + e.getUnitsToScroll());
        System.out.println(e.getScrollType());
      }

      zoom += e.getUnitsToScroll() * (zoom / 100.0);
      if(zoom < 0.5) {
        zoom = 0.5;
      }
      if(debug) System.out.println("zoom: " + zoom);

      updateFrame();
    }

    public void mouseReleased(MouseEvent e) {
      if(debug) {
        System.out.println("mouse released @ point [" + e.getX() + ", " + e.getY() + "]");
      }
      start = e.getPoint();
      dxOffset += offsetX;
      dyOffset += offsetY;
      offsetX = 0;
      offsetY = 0;

      updateFrame();
    }

    // required overrides
    public void mouseExited(MouseEvent e) {}

    public void mouseEntered(MouseEvent e) {}

    public void mouseClicked(MouseEvent e) {}

    public void mouseMoved(MouseEvent e) {}

    // triggered when mouse is pressed on JFrame
    public void mousePressed(MouseEvent e) {
      start = e.getPoint();
      if(debug) {
        System.out.println("mouse pressed @ point: " + start);
        System.out.println();
      }
    }

    // triggered when mouse is dragged across JFrame
    public void mouseDragged(MouseEvent e) {
      if(start != null) {
        Point currentPoint = e.getPoint();
        double dx = (start.getX() - currentPoint.getX());
        double dy = start.getY() - currentPoint.getY();

        if(debug) System.out.println("dx: " + dx + ", dy: " + dy);

        offsetX = dx / 800.0 / zoom;
        offsetY = dy / 600.0 / zoom;
      }
      updateFrame();
    }

    // constructor
    public JuliaSet(double a, double b) {
        setPreferredSize(new Dimension(800, 600));
        setBackground(Color.white);
        cX = a;
        cY = b;
        addMouseMotionListener(this);
        addMouseWheelListener(this);
        this.addMouseListener(this);
    }

    void drawJuliaSet(Graphics2D g) {
        int w = getWidth();
        int h = getHeight();
        BufferedImage image = new BufferedImage(w, h,
                BufferedImage.TYPE_INT_RGB);

          double moveX = dxOffset + offsetX;
          double moveY = dyOffset + offsetY;
          double zx, zy;

          for (int x = 0; x < w; x++) {
              for (int y = 0; y < h; y++) {
                  zx = 1.5 * (x - w / 2) / (0.5 * zoom * w) + moveX;
                  zy = (y - h / 2) / (0.5 * zoom * h) + moveY;
                  float i = maxIter;
                  while (zx * zx + zy * zy < 4 && i > 0) {
                      double tmp = zx * zx - zy * zy + cX;
                      zy = 2.0 * zx * zy + cY;
                      zx = tmp;
                      i--;
                  }
                  int c = Color.HSBtoRGB((maxIter / 1 / i) % 2, 1, i > 0 ? 1 : 0);
                  image.setRGB(x, y, c);
              }
          }
          g.drawImage(image, 0, 0, null);
    }

    @Override
    public void paintComponent(Graphics gg) {
        super.paintComponent(gg);
        Graphics2D g = (Graphics2D) gg;
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                RenderingHints.VALUE_ANTIALIAS_ON);
        drawJuliaSet(g);
    }

    // tries to update to new parameters if valid
    private static void tryToUpdateEquation(String aFieldText, String bFieldText) {
      try {
        cX = Double.parseDouble(aFieldText);
        cY = Double.parseDouble(bFieldText);
        equationDisplay.setText("[c = " + cX + " + " + cY + "i]");
      } catch (NumberFormatException exception) {
        System.out.println("error parsing new values");
      }
    }

    // resets the JFrame to draw a new set
    private static void resetFrame() {
      zoom = 1;
      dxOffset = 0;
      dyOffset = 0;
      offsetX = 0;
      offsetY = 0;

      if(!aField.getText().equals("") && !bField.getText().equals("")) {
        tryToUpdateEquation(aField.getText(), bField.getText());
        f.revalidate();
        f.repaint();
      }
    }

    // sets up JPanel UI for easier set equation customization
    private static void setUpUI() {
      panel = new JPanel();
      equationLabel = new JLabel("Equation Setup | ");
      equationLabel.setFont(equationLabel.getFont().deriveFont(equationLabel.getFont().getStyle() ^ Font.BOLD));

      aLabel = new JLabel("a:");
      aField = new JTextField(4);
      bLabel = new JLabel("b:");
      bField = new JTextField(4);

      equationDisplay = new JLabel("[c = " + cX + " + " + cY + "i]");
      equationDisplay.setFont(equationDisplay.getFont().deriveFont(equationDisplay.getFont().getStyle() ^ Font.BOLD));

      updateEquationButton = new JButton("Update");

      updateEquationButton.addActionListener(new ActionListener() {
        public void actionPerformed(ActionEvent e){
          resetFrame();
        }
      });

      panel.add(equationLabel);
      panel.add(aLabel);
      panel.add(aField);
      panel.add(bLabel);
      panel.add(bField);
      panel.add(updateEquationButton);
      panel.add(equationDisplay);
    }

    public static void main(String[] args) {
      SwingUtilities.invokeLater(() -> {
          f = new JFrame();

          f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
          f.setTitle("Java Fractals");
          f.setResizable(false);

          // set to have some default
          double a = -0.61803398875;
          double b = 0.0;

          if(args.length == 2) {
            try {
              a = Double.parseDouble(args[0]);
              b = Double.parseDouble(args[1]);
            } catch(Exception ex) {
              System.out.println("Custom initialization failed: Invalid command line arguments format. Expected: Double");
            }
          }

          f.add(new JuliaSet(a,b), BorderLayout.CENTER);

          f.pack();
          f.setLocationRelativeTo(null);
          f.setVisible(true);

          setUpUI();
          f.add(panel, BorderLayout.NORTH);
      });
    }
}
