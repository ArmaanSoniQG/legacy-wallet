#include "risc0/zkvm/circuit/make_circuit.h"
#include <cstddef>
#include <exception>
#include <string>
#include <type_traits>
#include <utility>

namespace rust {
inline namespace cxxbridge1 {
// #include "rust/cxx.h"

namespace repr {
struct PtrLen final {
  void *ptr;
  ::std::size_t len;
};
} // namespace repr

namespace detail {
class Fail final {
  ::rust::repr::PtrLen &throw$;
public:
  Fail(::rust::repr::PtrLen &throw$) noexcept : throw$(throw$) {}
  void operator()(char const *) noexcept;
  void operator()(std::string const &) noexcept;
};
} // namespace detail
} // namespace cxxbridge1

namespace behavior {
class missing {};
missing trycatch(...);

template <typename Try, typename Fail>
static typename ::std::enable_if<
    ::std::is_same<decltype(trycatch(::std::declval<Try>(), ::std::declval<Fail>())),
                 missing>::value>::type
trycatch(Try &&func, Fail &&fail) noexcept try {
  func();
} catch (::std::exception const &e) {
  fail(e.what());
}
} // namespace behavior
} // namespace rust

namespace risc0 {
namespace circuit {
extern "C" {
::rust::repr::PtrLen risc0$circuit$cxxbridge1$make_circuit(::std::string const &path) noexcept {
  void (*make_circuit$)(::std::string const &) = ::risc0::circuit::make_circuit;
  ::rust::repr::PtrLen throw$;
  ::rust::behavior::trycatch(
      [&] {
        make_circuit$(path);
        throw$.ptr = nullptr;
      },
      ::rust::detail::Fail(throw$));
  return throw$;
}
} // extern "C"
} // namespace circuit
} // namespace risc0
